// AI helpers — budget estimation via Groq

import path from 'path';
import dotenv from 'dotenv';
import type { Request, Response } from 'express';
import Groq from 'groq-sdk';

// Ensure server/.env is loaded when cwd is repo root (npm workspaces)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export async function estimateBudget(req: Request, res: Response): Promise<void> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'AI service not configured',
      });
      return;
    }

    const body = req.body as {
      eventType?: string;
      guestCount?: number | string;
      eventDate?: string;
    };
    const { eventType, eventDate } = body;
    const guestCountNum =
      typeof body.guestCount === 'number'
        ? body.guestCount
        : typeof body.guestCount === 'string'
          ? parseInt(body.guestCount, 10)
          : NaN;

    if (
      !eventType ||
      !Number.isFinite(guestCountNum) ||
      guestCountNum <= 0 ||
      !eventDate
    ) {
      res.status(400).json({
        success: false,
        error: 'eventType, guestCount (positive number), and eventDate are required',
      });
      return;
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pakistani event planner. Always respond with valid JSON only. No markdown, no explanation, no backticks.',
        },
        {
          role: 'user',
          content: `Give a realistic budget estimate in PKR for:
Event type: ${eventType}
Guest count: ${guestCountNum}
Event date: ${eventDate}

Return ONLY this JSON structure:
{
  "minBudget": 500000,
  "maxBudget": 1200000,
  "recommendedBudget": 800000,
  "breakdown": {
    "venue": 30,
    "catering": 35,
    "decor": 20,
    "photography": 10,
    "other": 5
  },
  "tip": "one short practical tip for this event type in Pakistan"
}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '{}';
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(jsonStr) as {
      minBudget: number;
      maxBudget: number;
      recommendedBudget: number;
      breakdown: Record<string, number>;
      tip: string;
    };

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(
      'AI estimate error details:',
      err instanceof Error ? err.message : err
    );
    console.error('AI estimate error full:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate estimate',
    });
  }
}

/** Public budget estimate for shared inquiry links (no JWT). */
export async function estimateInquiryBudget(req: Request, res: Response): Promise<void> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        success: false,
        error: 'AI service not configured',
      });
      return;
    }

    const body = req.body as {
      eventType?: string;
      guestCount?: number | string;
      eventDate?: string;
      venueType?: string;
      exactBudget?: number | string;
      isOwnVenue?: boolean;
    };
    const { eventType, eventDate, venueType } = body;
    const guestCountNum =
      typeof body.guestCount === 'number'
        ? body.guestCount
        : typeof body.guestCount === 'string'
          ? parseInt(body.guestCount, 10)
          : NaN;

    let exactBudgetPkr: number | null = null;
    if (
      typeof body.exactBudget === 'number' &&
      Number.isFinite(body.exactBudget) &&
      body.exactBudget > 0
    ) {
      exactBudgetPkr = Math.round(body.exactBudget);
    } else if (typeof body.exactBudget === 'string') {
      const parsed = parseFloat(body.exactBudget.replace(/,/g, '').trim());
      if (Number.isFinite(parsed) && parsed > 0) exactBudgetPkr = Math.round(parsed);
    }

    if (
      !eventType?.trim() ||
      !venueType?.trim() ||
      !Number.isFinite(guestCountNum) ||
      guestCountNum <= 0 ||
      !eventDate?.trim()
    ) {
      res.status(400).json({
        success: false,
        error: 'eventType, venueType, guestCount (positive number), and eventDate are required',
      });
      return;
    }

    const groq = new Groq({ apiKey });

    const userPrompt =
      exactBudgetPkr !== null
        ? `The client has a FIXED total budget of exactly ${exactBudgetPkr} PKR (Pakistani Rupees) for Pakistan for:
Event type: ${eventType.trim()}
Guest count: ${guestCountNum}
Event date: ${eventDate.trim()}
Venue type: ${venueType.trim()}

Return ONLY this JSON structure (minBudget, maxBudget, and recommendedBudget MUST all equal exactly ${exactBudgetPkr}):
{
  "minBudget": ${exactBudgetPkr},
  "maxBudget": ${exactBudgetPkr},
  "recommendedBudget": ${exactBudgetPkr},
  "breakdown": {
    "venue": 25,
    "catering": 35,
    "decor": 20,
    "photography": 10,
    "other": 10
  },
  "tip": "one short practical tip for stretching or prioritizing spend within this exact budget"
}

Rules:
- minBudget, maxBudget, recommendedBudget MUST all be integer ${exactBudgetPkr}.
- breakdown values are percentages (0-100) that sum to 100 for how to SPLIT the total ${exactBudgetPkr} PKR across venue, catering, decor, photography, and other.`
        : `Give a realistic total budget estimate in PKR for Pakistan for:
Event type: ${eventType.trim()}
Guest count: ${guestCountNum}
Event date: ${eventDate.trim()}
Venue type: ${venueType.trim()}

Consider how venue type affects cost (e.g. Farmhouse vs Hotel Ballroom vs Marquee).

Return ONLY this JSON structure:
{
  "minBudget": 1200000,
  "maxBudget": 2500000,
  "recommendedBudget": 1875000,
  "breakdown": {
    "venue": 25,
    "catering": 35,
    "decor": 20,
    "photography": 10,
    "other": 10
  },
  "tip": "one short practical tip for this event and venue in Pakistan"
}

Rules:
- minBudget < recommendedBudget < maxBudget when possible.
- breakdown values are percentages (0-100) that should sum to 100.
- All budgets are realistic PKR totals for the guest count and venue.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pakistani event planner. Always respond with valid JSON only. No markdown, no explanation, no backticks. All amounts are PKR integers.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '{}';
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(jsonStr) as {
      minBudget: number;
      maxBudget: number;
      recommendedBudget: number;
      breakdown: Record<string, number>;
      tip: string;
    };

    if (
      typeof parsed.minBudget !== 'number' ||
      typeof parsed.maxBudget !== 'number' ||
      typeof parsed.recommendedBudget !== 'number' ||
      !parsed.breakdown ||
      typeof parsed.tip !== 'string'
    ) {
      res.status(500).json({
        success: false,
        error: 'Invalid AI response shape',
      });
      return;
    }

    if (exactBudgetPkr !== null) {
      parsed.minBudget = exactBudgetPkr;
      parsed.maxBudget = exactBudgetPkr;
      parsed.recommendedBudget = exactBudgetPkr;
    }

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(
      'estimateInquiryBudget error:',
      err instanceof Error ? err.message : err
    );
    res.status(500).json({
      success: false,
      error: 'Failed to generate estimate',
    });
  }
}

export async function suggestLayout(req: Request, res: Response): Promise<void> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'AI service not configured',
      });
      return;
    }

    const {
      eventType,
      guestCount: guestCountRaw,
      venueName,
      budgetCeiling,
      seatingNotes,
    } = req.body as {
      eventType?: string;
      guestCount?: number | string;
      venueName?: string;
      budgetCeiling?: number;
      seatingNotes?: string | null;
    };

    const guestCountNum =
      typeof guestCountRaw === 'number'
        ? guestCountRaw
        : guestCountRaw != null && String(guestCountRaw).trim() !== ''
          ? Number(guestCountRaw)
          : NaN;

    if (!eventType || !Number.isFinite(guestCountNum) || guestCountNum < 1) {
      res.status(400).json({
        success: false,
        error: 'eventType and guestCount required',
      });
      return;
    }

    const groq = new Groq({ apiKey });

    const inventoryText = `
SEATING:
- Banquet Chair (Rs.1500, stock:300)
- chair type 2 (Rs.200, stock:999)
- Chiavari Chair (Gold) (Rs.2500, stock:200)
- Chiavari Chair (Silver) (Rs.2500, stock:150)
- Lounge Chair (Rs.8000, stock:40)
- Lounge Sofa (3-seater) (Rs.15000, stock:20)
- Ottoman (Rs.4000, stock:30)
- Royal green sofa (Rs.500, stock:999)
- Royal red sofa (Rs.500, stock:999)

TABLES:
- Cocktail Table (High) (Rs.3500, stock:60)
- Cocktail Table (Low) (Rs.3000, stock:40)
- Rectangular Table (6-seat) (Rs.6000, stock:40)
- Rectangular Table (8-seat) (Rs.7500, stock:35)
- Round Table (10-seat) (Rs.10000, stock:30)
- Round Table (8-seat) (Rs.8000, stock:50)

LIGHTING:
- Crystal Chandelier (Large) (Rs.45000, stock:10)
- Crystal Chandelier (Medium) (Rs.30000, stock:15)
- Fairy Light Curtain (Rs.5000, stock:50)
- Pendant Light Cluster (Rs.12000, stock:30)
- Uplighter (LED) (Rs.3000, stock:80)

DECOR:
- Candelabra (5-arm) (Rs.6000, stock:40)
- Floral Centerpiece (Premium) (Rs.8000, stock:60)
- Floral Centerpiece (Standard) (Rs.5000, stock:100)
- Floral vase (Rs.200, stock:999)
- Glass Vase Arrangement (Rs.3500, stock:80)
- Magnolia in a vase (Rs.500, stock:999)
- Table Runner (Sequin) (Rs.2000, stock:150)
- white flower in white vase (Rs.300, stock:999)

STAGING:
- Dance Floor Panel (Rs.8000, stock:50)
- Stage Platform (4x8) (Rs.35000, stock:8)
- Stage Riser (2x4) (Rs.12000, stock:20)
- Stage Skirting (per meter) (Rs.1500, stock:100)

BACKDROPS:
- Floral Arch (Rs.40000, stock:5)
- Neon Sign (Custom) (Rs.20000, stock:10)
- Photo Backdrop (Floral) (Rs.25000, stock:12)
- Photo Backdrop (Sequin) (Rs.18000, stock:15)
- Pipe and Drape (White) (Rs.15000, stock:20)`;

    const seatingContext = seatingNotes
      ? `\nCLIENT REQUIREMENTS FROM INQUIRY:\n${seatingNotes}\nUse these quantities as guidance.`
      : '';

    const budgetContext = budgetCeiling
      ? `\nBUDGET CEILING: Rs. ${budgetCeiling.toLocaleString()} — try to stay within this.`
      : '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are an expert Pakistani event designer. Suggest which assets to place for this event.

RULES:
1. Only use asset names EXACTLY as listed in the inventory
2. Never exceed stock quantities
3. Choose assets appropriate for the event type and guest count
4. For weddings: prefer Chiavari chairs, round tables, floral decor, chandeliers
5. For birthdays: mix of seating, colorful decor, cocktail tables
6. For corporate: rectangular tables, banquet chairs, minimal decor
7. For mehndi: lots of sofas, colorful decor, fairy lights
8. Always include: seating for all guests, tables, at least one lighting item, some decor, staging if budget allows
9. Return ONLY valid JSON array, no markdown, no explanation`,
        },
        {
          role: 'user',
          content: `Suggest a layout for:
Event type: ${eventType}
Guest count: ${guestCountNum}
Venue: ${venueName || 'General venue'}
${seatingContext}
${budgetContext}

AVAILABLE INVENTORY:
${inventoryText}

Return ONLY a JSON array of 8-15 items:
[
  {
    "assetName": "exact name from inventory",
    "quantity": 25,
    "placement": "center of hall",
    "reason": "why this suits the event",
    "unitPrice": 10000,
    "totalPrice": 250000
  }
]

Important:
- assetName must EXACTLY match inventory names
- quantity must not exceed stock
- Be realistic about quantities for ${guestCountNum} guests
- Prioritize seating for ALL guests first`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '[]';
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    let suggestions: unknown[];
    try {
      const parsed = JSON.parse(jsonStr);
      suggestions = Array.isArray(parsed) ? parsed : [];
    } catch {
      res.status(500).json({
        success: false,
        error: 'Failed to parse layout suggestions',
      });
      return;
    }

    const INVENTORY_STOCK: Record<string, number> = {
      'Banquet Chair': 300,
      'chair type 2': 999,
      'Chiavari Chair (Gold)': 200,
      'Chiavari Chair (Silver)': 150,
      'Lounge Chair': 40,
      'Lounge Sofa (3-seater)': 20,
      Ottoman: 30,
      'Royal green sofa': 999,
      'Royal red sofa': 999,
      'Cocktail Table (High)': 60,
      'Cocktail Table (Low)': 40,
      'Rectangular Table (6-seat)': 40,
      'Rectangular Table (8-seat)': 35,
      'Round Table (10-seat)': 30,
      'Round Table (8-seat)': 50,
      'Crystal Chandelier (Large)': 10,
      'Crystal Chandelier (Medium)': 15,
      'Fairy Light Curtain': 50,
      'Pendant Light Cluster': 30,
      'Uplighter (LED)': 80,
      'Candelabra (5-arm)': 40,
      'Floral Centerpiece (Premium)': 60,
      'Floral Centerpiece (Standard)': 100,
      'Floral vase': 999,
      'Glass Vase Arrangement': 80,
      'Magnolia in a vase': 999,
      'Table Runner (Sequin)': 150,
      'white flower in white vase': 999,
      'Dance Floor Panel': 50,
      'Stage Platform (4x8)': 8,
      'Stage Riser (2x4)': 20,
      'Stage Skirting (per meter)': 100,
      'Floral Arch': 5,
      'Neon Sign (Custom)': 10,
      'Photo Backdrop (Floral)': 12,
      'Photo Backdrop (Sequin)': 15,
      'Pipe and Drape (White)': 20,
    };

    const INVENTORY_PRICES: Record<string, number> = {
      'Banquet Chair': 1500,
      'chair type 2': 200,
      'Chiavari Chair (Gold)': 2500,
      'Chiavari Chair (Silver)': 2500,
      'Lounge Chair': 8000,
      'Lounge Sofa (3-seater)': 15000,
      Ottoman: 4000,
      'Royal green sofa': 500,
      'Royal red sofa': 500,
      'Cocktail Table (High)': 3500,
      'Cocktail Table (Low)': 3000,
      'Rectangular Table (6-seat)': 6000,
      'Rectangular Table (8-seat)': 7500,
      'Round Table (10-seat)': 10000,
      'Round Table (8-seat)': 8000,
      'Crystal Chandelier (Large)': 45000,
      'Crystal Chandelier (Medium)': 30000,
      'Fairy Light Curtain': 5000,
      'Pendant Light Cluster': 12000,
      'Uplighter (LED)': 3000,
      'Candelabra (5-arm)': 6000,
      'Floral Centerpiece (Premium)': 8000,
      'Floral Centerpiece (Standard)': 5000,
      'Floral vase': 200,
      'Glass Vase Arrangement': 3500,
      'Magnolia in a vase': 500,
      'Table Runner (Sequin)': 2000,
      'white flower in white vase': 300,
      'Dance Floor Panel': 8000,
      'Stage Platform (4x8)': 35000,
      'Stage Riser (2x4)': 12000,
      'Stage Skirting (per meter)': 1500,
      'Floral Arch': 40000,
      'Neon Sign (Custom)': 20000,
      'Photo Backdrop (Floral)': 25000,
      'Photo Backdrop (Sequin)': 18000,
      'Pipe and Drape (White)': 15000,
    };

    const validated = suggestions
      .filter(
        (s: unknown): s is { assetName?: string; quantity?: number; placement?: string; reason?: string; unitPrice?: number } =>
          typeof s === 'object' && s !== null
      )
      .filter((s) => s.assetName && INVENTORY_STOCK[s.assetName] !== undefined)
      .map((s) => {
        const maxStock = INVENTORY_STOCK[s.assetName!];
        const rawQty = typeof s.quantity === 'number' && s.quantity > 0 ? Math.floor(s.quantity) : 0;
        const cappedQty = Math.min(rawQty, maxStock);
        const unitPrice = INVENTORY_PRICES[s.assetName!] ?? s.unitPrice ?? 0;
        return {
          assetName: s.assetName!,
          quantity: cappedQty,
          originalQuantity: rawQty,
          wasCapped: cappedQty < rawQty,
          placement: s.placement || 'in venue',
          reason: s.reason || '',
          unitPrice,
          totalPrice: unitPrice * cappedQty,
        };
      })
      .filter((row) => row.quantity > 0);

    const grandTotal = validated.reduce((sum, row) => sum + row.totalPrice, 0);
    const overBudget = budgetCeiling ? grandTotal > budgetCeiling : false;

    res.json({
      success: true,
      data: {
        suggestions: validated,
        grandTotal,
        overBudget,
        budgetCeiling: budgetCeiling ?? null,
      },
    });
  } catch (err) {
    console.error('AI layout suggest error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate layout suggestions',
    });
  }
}

export async function parseInquiry(req: Request, res: Response): Promise<void> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'AI service not configured',
      });
      return;
    }

    const { description } = req.body as { description?: string };

    if (!description || description.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: 'Please provide a description',
      });
      return;
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            'You are a Pakistani event planning assistant. Extract event details from the client description and return ONLY valid JSON. No markdown, no explanation, no backticks.',
        },
        {
          role: 'user',
          content: `Extract event planning details from this description:
"${description.trim()}"

Return ONLY this JSON (use null for missing info):
{
  "eventType": "Wedding",
  "eventDate": "2026-06-15",
  "guestCount": 300,
  "venueType": "Banquet Hall",
  "seatingStyle": "Banquet",
  "mealPreference": "Premium Buffet",
  "budgetRange": "Rs. 300,000 – 500,000",
  "lightingPreference": "Fairy Lights",
  "addons": ["Photography", "Special lighting"],
  "specialRequests": "any extra details mentioned",
  "confidence": "high"
}

Rules:
- eventType must be one of: Wedding, Mehndi, Birthday, Corporate, Other
- eventDate must be YYYY-MM-DD format; if only month mentioned use next occurrence in the future
- guestCount must be a number
- venueType must be one of: Banquet Hall, Marquee / Tent, Farmhouse, Hotel Ballroom, Outdoor Garden, Rooftop, Beach / Resort, Custom / Other
- seatingStyle must be one of: Banquet, Theatre, Cocktail, Custom
- mealPreference must be one of: Basic, Standard Buffet, Premium Buffet, Custom Menu
- budgetRange must be exactly one of: Under Rs. 50,000 | Rs. 50,000 – 150,000 | Rs. 150,000 – 300,000 | Rs. 300,000 – 500,000 | Above Rs. 500,000
- lightingPreference must be one of: Basic, Fairy Lights, LED, Chandeliers, Custom
- addons must only include items from: Special lighting, Custom decorations, Extra seating, Premium stage design, Floral arrangements, Photography, Videography, Sound system
- Use null for any field you cannot determine`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '{}';
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(jsonStr);
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('AI parse inquiry error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to parse inquiry',
    });
  }
}
