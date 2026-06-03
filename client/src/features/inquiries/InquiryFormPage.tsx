import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import * as inquiriesApi from './inquiries.api';
import {
  STEP_LABELS,
  EVENT_TYPES,
  VENUE_TYPES,
  SEATING_STYLES,
  MEAL_OPTIONS,
  ADDONS,
  BUDGETS,
  LIGHTING,
} from './inquiry.constants';
import './InquiryFormPage.css';

const MEAL_LABELS_NEEDING_MEAT = new Set<string>([
  'Standard Buffet',
  'Premium Buffet',
  'Daig / Deg Style',
]);

const OWN_VENUE_TYPES = new Set<string>(['Home', 'Garden / Outdoor (Own)', 'Custom / Other']);

function isClientOwnVenue(venueType: string): boolean {
  return OWN_VENUE_TYPES.has(venueType.trim());
}

function formatInquiryBudgetBreakdownLines(
  breakdown: Record<string, number>,
  total: number,
  excludeVenue: boolean,
  fmtAmt: (n: number) => string
): string {
  let entries = Object.entries(breakdown).map(
    ([k, v]) => [k, typeof v === 'number' && Number.isFinite(v) ? v : 0] as const
  );
  if (excludeVenue) {
    entries = entries.filter(([k]) => k.toLowerCase() !== 'venue');
  }
  const sumPct = entries.reduce((s, [, p]) => s + p, 0);
  if (sumPct <= 0) return '';
  const bdLabels: Record<string, string> = {
    venue: 'Venue',
    catering: 'Catering',
    decor: 'Decor',
    photography: 'Photography',
    other: 'Other',
  };
  return entries
    .map(([key, pct]) => {
      const label = bdLabels[key.toLowerCase()] ?? key;
      const pctNorm = Math.round((pct / sumPct) * 100);
      const amt = Math.round((total * pct) / sumPct);
      return `${label.padEnd(11)} ${pctNorm}% — ${fmtAmt(amt)}`;
    })
    .join('\n');
}

interface FormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  venueType: string;
  venueAddress: string;
  hallPreference: string;
  seatingStyle: string;
  seatingNotes: string;
  mealPreference: string;
  addons: string[];
  budgetRange: string;
  lightingPreference: string;
  decorationPreference: string;
  specialRequests: string;
}

const GUEST_OPTIONS = [
  { label: 'Under 50', count: 40 },
  { label: '50–100', count: 75 },
  { label: '100–200', count: 150 },
  { label: '200–300', count: 250 },
  { label: '300–500', count: 400 },
  { label: '500+', count: 500 },
];

const STEP_LABELS_CHAT = [
  'Event Type',
  'Guest Count',
  'Event Date',
  'Venue Type',
  'Budget',
  'Meal & Extras',
  'Phone & venue',
  'Your Details',
  'Review & Submit',
];

/** Venues with typical rental fees — address step is not required. */
const OFFICIAL_VENUE_TYPES = new Set<string>([
  'Banquet Hall',
  'Marquee / Tent',
  'Farmhouse',
  'Hotel Ballroom',
  'Outdoor Garden',
  'Rooftop',
  'Beach / Resort',
]);

function isOfficialVenue(venueType: string): boolean {
  return OFFICIAL_VENUE_TYPES.has(venueType.trim());
}

type ReviewFieldKey =
  | 'event'
  | 'guests'
  | 'date'
  | 'venue'
  | 'budget'
  | 'meal'
  | 'extras'
  | 'phone'
  | 'time'
  | 'address'
  | 'name'
  | 'email';

const DEFAULT_FORM: FormData = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  eventType: 'Wedding',
  eventDate: '',
  eventTime: '',
  guestCount: 200,
  venueType: '',
  venueAddress: '',
  hallPreference: '',
  seatingStyle: 'Banquet',
  seatingNotes: '',
  mealPreference: '',
  addons: [],
  budgetRange: '',
  lightingPreference: 'Fairy Lights',
  decorationPreference: '',
  specialRequests: '',
};

export function InquiryFormPage() {
  const { token } = useParams<{ token: string }>();
  const STORAGE_KEY = `dreamstage-inquiry-${token}`;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<FormData | null>(null);

  const [themeIsDark, setThemeIsDark] = useState(true);

  const [meta, setMeta] = useState<{ plannerName: string; isSubmitted: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [progressHidden, setProgressHidden] = useState(false);
  const [awaitingCustomEventType, setAwaitingCustomEventType] = useState(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-customtype-${token}`);
    return saved === '1';
  });
  const [awaitingCustomVenue, setAwaitingCustomVenue] = useState(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-customvenue-${token}`);
    return saved === '1';
  });
  const [awaitingExactGuests, setAwaitingExactGuests] = useState(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-exactguests-${token}`);
    return saved === '1';
  });
  const [awaitingExactDate, setAwaitingExactDate] = useState(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-exactdate-${token}`);
    return saved === '1';
  });
  const [awaitingExactBudget, setAwaitingExactBudget] = useState(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-exactbudget-${token}`);
    return saved === '1';
  });
  const [customMenuDraft, setCustomMenuDraft] = useState('');

  const [chatStep, setChatStep] = useState<number>(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-step-${token}`);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [messages, setMessages] = useState<Array<{ type: 'ai' | 'client'; text: string; time: Date }>>(() => {
    const saved = localStorage.getItem(`dreamstage-inquiry-msgs-${token}`);
    if (saved) {
      try {
        return JSON.parse(saved).map((m: { type: 'ai' | 'client'; text: string; time: string }) => ({
          ...m,
          time: new Date(m.time),
        }));
      } catch {
        /* ignore */
      }
    }
    return [];
  });
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [editingReviewField, setEditingReviewField] = useState<ReviewFieldKey | null>(null);
  const [reviewEditDraft, setReviewEditDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const step3DateRef = useRef<HTMLInputElement | null>(null);
  const customVenueInputRef = useRef<HTMLInputElement | null>(null);
  const exactBudgetInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<FormData>;
        return { ...DEFAULT_FORM, ...parsed };
      } catch {
        /* ignore */
      }
    }
    return { ...DEFAULT_FORM };
  });

  formRef.current = form;

  useEffect(() => {
    if (token) localStorage.setItem(`dreamstage-inquiry-${token}`, JSON.stringify(form));
  }, [form, token]);

  useEffect(() => {
    if (token) localStorage.setItem(`dreamstage-inquiry-step-${token}`, String(chatStep));
  }, [chatStep, token]);

  useEffect(() => {
    if (token) localStorage.setItem(`dreamstage-inquiry-msgs-${token}`, JSON.stringify(messages));
  }, [messages, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        `dreamstage-inquiry-customtype-${token}`,
        awaitingCustomEventType ? '1' : '0'
      );
    }
  }, [awaitingCustomEventType, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        `dreamstage-inquiry-customvenue-${token}`,
        awaitingCustomVenue ? '1' : '0'
      );
    }
  }, [awaitingCustomVenue, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        `dreamstage-inquiry-exactguests-${token}`,
        awaitingExactGuests ? '1' : '0'
      );
    }
  }, [awaitingExactGuests, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        `dreamstage-inquiry-exactdate-${token}`,
        awaitingExactDate ? '1' : '0'
      );
    }
  }, [awaitingExactDate, token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(
        `dreamstage-inquiry-exactbudget-${token}`,
        awaitingExactBudget ? '1' : '0'
      );
    }
  }, [awaitingExactBudget, token]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTheme = () => {
    setThemeIsDark((d) => !d);
  };

  const themeButtonLabel = themeIsDark ? '☀️ Light mode' : '🌙 Dark mode';

  const animateCard = useCallback((dir: 'forward' | 'backward' | 'none') => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--slide-from', dir === 'forward' ? '20px' : dir === 'backward' ? '-20px' : '0px');
    card.classList.remove('step-anim');
    void card.offsetWidth;
    card.classList.add('step-anim');
  }, []);

  const submitForm = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('clientName', form.clientName);
      fd.append('clientEmail', form.clientEmail);
      fd.append('clientPhone', form.clientPhone);
      fd.append('eventType', form.eventType);
      fd.append('eventDate', form.eventDate);
      fd.append('eventTime', form.eventTime.trim() || 'TBD');
      fd.append('guestCount', String(form.guestCount));
      fd.append('venueType', form.venueType);
      fd.append('venueAddress', form.venueAddress);
      fd.append('hallPreference', form.hallPreference);
      fd.append('seatingStyle', form.seatingStyle);
      fd.append('seatingNotes', form.seatingNotes);
      fd.append('mealPreference', form.mealPreference);
      fd.append('addons', JSON.stringify(form.addons));
      fd.append('budgetRange', form.budgetRange);
      fd.append('lightingPreference', form.lightingPreference);
      fd.append('decorationPreference', form.decorationPreference);
      fd.append('specialRequests', form.specialRequests);
      await inquiriesApi.submitInquiryPublic(token, fd);
      setApprovedSuccess(true);
      localStorage.removeItem(`dreamstage-inquiry-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-step-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-msgs-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-customtype-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-customvenue-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-exactguests-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-exactdate-${token}`);
      localStorage.removeItem(`dreamstage-inquiry-exactbudget-${token}`);
      setProgressHidden(true);
      animateCard('none');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (!meta || meta.isSubmitted || messages.length > 0) return undefined;
    const ids: number[] = [];
    const t0 = window.setTimeout(() => {
      setMessages([
        {
          type: 'ai',
          text: "👋 Hi! I'm your DreamStage planning assistant. Let's put together your event details in just a few quick questions!",
          time: new Date(),
        },
      ]);
      ids.push(
        window.setTimeout(() => {
          setIsAiTyping(true);
          ids.push(
            window.setTimeout(() => {
              setIsAiTyping(false);
              setMessages((prev) => [
                ...prev,
                {
                  type: 'ai',
                  text: '🎉 First — what type of event are you planning?',
                  time: new Date(),
                },
              ]);
              setChatStep(1);
            }, 1000)
          );
        }, 1200)
      );
    }, 500);
    ids.push(t0);
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
    };
  }, [meta]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await inquiriesApi.getInquiryPublic(token);
        if (cancelled) return;
        setMeta({
          plannerName: data.meta.plannerName,
          isSubmitted: data.meta.isSubmitted,
        });
        if (data.meta.isSubmitted) {
          setApprovedSuccess(true);
          setProgressHidden(true);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.error || 'Invalid link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const successTitle = useMemo(() => {
    const name = form.clientName?.trim() || 'there';
    return `Thank you, ${name}!`;
  }, [form.clientName]);

  const successMeta = useMemo(() => {
    const eventType = form.eventType || 'Event';
    const budget = form.budgetRange || 'Budget TBD';
    return `${eventType} · ${form.guestCount} guests · ${budget}`;
  }, [form.eventType, form.guestCount, form.budgetRange]);

  const budgetMatchesPreset = useMemo(
    () => (BUDGETS as readonly string[]).includes(form.budgetRange),
    [form.budgetRange]
  );

  const lightingIsPreset = useMemo(
    () => (LIGHTING as readonly string[]).includes(form.lightingPreference),
    [form.lightingPreference]
  );

  const addClientMessage = (text: string) => {
    setMessages((prev) => [...prev, { type: 'client', text, time: new Date() }]);
  };

  const handleEventType = (type: string) => {
    if (type === 'Other') {
      addClientMessage('Other');
      setIsAiTyping(true);
      setAwaitingCustomEventType(true);
      window.setTimeout(() => {
        setIsAiTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            type: 'ai',
            text: "✨ Sounds interesting! Could you tell me what kind of event you're planning?",
            time: new Date(),
          },
        ]);
      }, 800);
    } else {
      set('eventType', type);
      addClientMessage(type);
      setIsAiTyping(true);
      window.setTimeout(() => {
        setIsAiTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            type: 'ai',
            text: `${type === 'Wedding' ? '💍 Beautiful' : type === 'Birthday' ? '🎂 Fun' : type === 'Mehndi' ? '🌸 Lovely' : type === 'Corporate' ? '💼 Professional' : '✨ Great'} choice! How many guests are you expecting?`,
            time: new Date(),
          },
        ]);
        setChatStep(2);
      }, 800);
    }
  };

  const handleCustomEventType = (customType: string) => {
    if (!customType.trim()) {
      toast.error('Please enter your event type');
      return;
    }
    set('eventType', customType.trim());
    setAwaitingCustomEventType(false);
    addClientMessage(customType.trim());
    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: `✨ Great — a ${customType.trim()}! How many guests are you expecting?`,
          time: new Date(),
        },
      ]);
      setChatStep(2);
    }, 800);
  };

  const handleGuestCount = (range: string, count: number) => {
    set('guestCount', count);
    addClientMessage(range);
    setIsAiTyping(true);
    setAwaitingExactGuests(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: `👥 Got it — ${range} guests! Could you give me the exact number so I can plan accurately?`,
          time: new Date(),
        },
      ]);
    }, 800);
  };

  const handleExactGuestCount = (exactCount: number) => {
    if (!exactCount || exactCount < 1) {
      toast.error('Please enter a valid number of guests');
      return;
    }
    set('guestCount', exactCount);
    setAwaitingExactGuests(false);
    addClientMessage(`${exactCount} guests`);
    const tables = Math.ceil(exactCount / 10);
    const sofas = exactCount > 100 ? 2 : 1;
    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: `Perfect — ${exactCount} guests! I'd suggest:\n🪑 ${tables} round tables (10 seats each)\n🛋️ ${sofas} sofa set${sofas > 1 ? 's' : ''} for family seating\n🎪 1 stage with backdrop\nYour planner will fine-tune this in the 3D designer!\n\n📅 When is your event?`,
          time: new Date(),
        },
      ]);
      set('seatingNotes', `${tables} round tables, ${sofas} sofa sets, 1 stage`);
      setAwaitingExactDate(true);
      setChatStep(3);
    }, 800);
  };

  const handleDate = (dateStr: string, label: string) => {
    const selectedDate = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const f = formRef.current ?? form;
    const isBigEvent =
      ['Wedding', 'Mehndi', 'Walima', 'Engagement'].includes(f.eventType) || f.guestCount >= 50;

    if (isBigEvent) {
      const minMonths = 4;
      const minDate = new Date(today);
      minDate.setMonth(minDate.getMonth() + minMonths);
      if (selectedDate < minDate) {
        addClientMessage(label);
        setIsAiTyping(true);
        window.setTimeout(() => {
          setIsAiTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              type: 'ai',
              text: `⚠️ A ${f.eventType} with ${f.guestCount} guests needs at least 4-6 months of planning time to arrange venues, catering, and décor properly.\n\nPlease select a date that is at least 4 months from today (after ${minDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}).\n\n📅 When is your event?`,
              time: new Date(),
            },
          ]);
        }, 800);
        return;
      }
    } else {
      const minDays = 3;
      if (diffDays < minDays) {
        addClientMessage(label);
        setIsAiTyping(true);
        window.setTimeout(() => {
          setIsAiTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              type: 'ai',
              text: `⚠️ Even for a smaller ${f.eventType}, we need at least 3 days to coordinate everything properly.\n\nPlease select a date that is at least 3 days from today.\n\n📅 When is your event?`,
              time: new Date(),
            },
          ]);
        }, 800);
        return;
      }
    }

    // Date is valid — proceed normally
    setAwaitingExactDate(false);
    set('eventDate', dateStr);
    addClientMessage(label);
    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: `📅 Got it — ${label}!\n\n🏛️ What kind of venue are you thinking?`,
          time: new Date(),
        },
      ]);
      setChatStep(4);
    }, 800);
  };

  const runVenueBudgetFlow = (venueLabelForUi: string) => {
    const f = formRef.current ?? form;
    const g = f.guestCount;
    const eventType = f.eventType;

    setMessages((prev) => [
      ...prev,
      {
        type: 'ai',
        text: `Great choice! ✨ Your ${eventType} for ${g} guests at a ${venueLabelForUi} is taking shape.\n\nNext, share your total planned budget — we'll sketch how you might allocate it.`,
        time: new Date(),
      },
    ]);

    setAwaitingExactBudget(true);
    setChatStep(5);
  };

  const handleVenueType = (venue: string) => {
    set('venueType', venue);
    addClientMessage(venue);

    if (venue === 'Custom / Other') {
      setAwaitingCustomVenue(true);
      setIsAiTyping(true);
      window.setTimeout(() => {
        setIsAiTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            type: 'ai',
            text: "📍 Got it! Could you tell me where exactly you're thinking?\n(e.g. a specific area, garden, home, or address)",
            time: new Date(),
          },
        ]);
      }, 800);
      return;
    }

    runVenueBudgetFlow(venue);
  };

  const handleCustomVenue = (location: string) => {
    if (!location.trim()) {
      toast.error('Please describe your venue location');
      return;
    }
    const loc = location.trim();
    set('hallPreference', loc);
    setAwaitingCustomVenue(false);
    addClientMessage(loc);
    runVenueBudgetFlow(`${loc} (custom venue)`);
  };

  const handleExactBudget = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid budget amount in PKR');
      return;
    }
    const rounded = Math.round(amount);
    const fmtDisplay = (n: number) => `Rs. ${n.toLocaleString('en-PK')}`;

    set('budgetRange', fmtDisplay(rounded));
    setAwaitingExactBudget(false);
    addClientMessage(fmtDisplay(rounded));
    setIsAiTyping(true);

    type InquiryEst = {
      minBudget: number;
      maxBudget: number;
      recommendedBudget: number;
      breakdown: Record<string, number>;
      tip: string;
    };

    void (async () => {
      const f = formRef.current ?? form;
      const eventDate = f.eventDate?.trim() || new Date().toISOString().slice(0, 10);
      const venueType = f.venueType?.trim() || 'Venue';

      let est: InquiryEst | null = null;
      try {
        const res = await fetch('/api/ai/estimate-inquiry-budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: f.eventType,
            guestCount: f.guestCount,
            eventDate,
            venueType,
            exactBudget: rounded,
            isOwnVenue: isClientOwnVenue(f.venueType),
          }),
        });
        const json = (await res.json()) as { success?: boolean; data?: InquiryEst; error?: string };
        if (res.ok && json.success && json.data) est = json.data;
      } catch {
        /* network */
      }

      setIsAiTyping(false);

      const ownVenue = isClientOwnVenue(f.venueType);
      const fmtAmt = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;

      let breakdownText: string;
      if (est) {
        const lines = formatInquiryBudgetBreakdownLines(est.breakdown, rounded, ownVenue, fmtAmt);
        breakdownText = `${ownVenue ? "🏠 No venue rental cost — using your own space.\n\n" : ''}💰 Here's how I'd suggest splitting ${fmtDisplay(rounded)}:\n\n${lines}\n\n💡 ${est.tip}\n\n⚠️ Your planner will review this and adjust as needed.`;
      } else {
        toast.warning('Could not load budget breakdown suggestions right now.');
        breakdownText = `I've saved your budget as ${fmtDisplay(rounded)}. Your planner will help you allocate it across catering, décor, and more.\n\n⚠️ Your planner will review this and adjust as needed.`;
      }

      setMessages((prev) => [
        ...prev,
        { type: 'ai', text: breakdownText, time: new Date() },
        {
          type: 'ai',
          text: 'Perfect! 🍽️ What kind of meal service would you like? And any extras?',
          time: new Date(),
        },
      ]);
      setChatStep(6);
    })();
  };

  const handleMealAndAddons = () => {
    addClientMessage(
      `${form.mealPreference}${form.addons.length > 0 ? ' + ' + form.addons.join(', ') : ''}`
    );
    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: "Almost done! 😊 Next — your phone, when the event starts, and where it's happening (if needed).",
          time: new Date(),
        },
      ]);
      setChatStep(7);
    }, 800);
  };

  const mealStepComplete = useMemo(() => {
    const pref = form.mealPreference.trim();
    if (!pref) return false;
    const base = pref.split(' — ')[0].trim();
    if (!MEAL_OPTIONS.some((m) => m.label === base)) return false;
    if (MEAL_LABELS_NEEDING_MEAT.has(base)) return pref.includes(' — ');
    if (base === 'Custom Menu') return customMenuDraft.trim().length > 0;
    return true;
  }, [form.mealPreference, customMenuDraft]);

  const mealBaseLabel = form.mealPreference.split(' — ')[0].trim();
  const showMeatFollowUp =
    chatStep === 6 &&
    MEAL_LABELS_NEEDING_MEAT.has(mealBaseLabel) &&
    !form.mealPreference.includes(' — ');
  const showCustomMenuInput = chatStep === 6 && mealBaseLabel === 'Custom Menu';

  const showVenueAddressField = useMemo(
    () => form.venueType.trim() !== '' && !isOfficialVenue(form.venueType),
    [form.venueType]
  );

  const handleContactExtrasDone = () => {
    if (!form.clientPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (showVenueAddressField && !form.venueAddress.trim()) {
      toast.error('Please enter the event address or area');
      return;
    }

    const timeVal = form.eventTime.trim() ? form.eventTime.trim() : 'TBD';
    if (!form.eventTime.trim()) {
      set('eventTime', 'TBD');
    }

    const msgParts = [`📞 ${form.clientPhone.trim()}`, `⏰ ${timeVal}`];
    if (form.venueAddress.trim()) msgParts.push(`📍 ${form.venueAddress.trim()}`);
    addClientMessage(msgParts.join(' · '));

    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: "Great — almost there! What's your name and email so we can reach you?",
          time: new Date(),
        },
      ]);
      setChatStep(8);
    }, 800);
  };

  const selectMealOption = (m: (typeof MEAL_OPTIONS)[number]) => {
    if (m.label !== 'Custom Menu') setCustomMenuDraft('');
    set('mealPreference', m.label);
  };

  const handleMealStepContinue = () => {
    if (!mealStepComplete) return;
    const base = form.mealPreference.split(' — ')[0].trim();
    if (base === 'Custom Menu') {
      const note = customMenuDraft.trim();
      if (note) {
        const block = `Menu / preferences: ${note}`;
        setForm((prev) => ({
          ...prev,
          specialRequests: prev.specialRequests.trim() ? `${prev.specialRequests}\n\n${block}` : block,
        }));
        setCustomMenuDraft('');
      }
    }
    handleMealAndAddons();
  };

  const handleContactDone = () => {
    if (!form.clientPhone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (showVenueAddressField && !form.venueAddress.trim()) {
      toast.error('Please enter the event address or area');
      return;
    }
    if (!form.clientName.trim() || !form.clientEmail.trim()) {
      toast.error('Please enter your name and email');
      return;
    }
    addClientMessage(`${form.clientName} · ${form.clientEmail}`);
    setIsAiTyping(true);
    window.setTimeout(() => {
      setIsAiTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          text: "✨ Perfect! Here's a summary of everything. Does it all look right?",
          time: new Date(),
        },
      ]);
      setChatStep(9);
    }, 800);
  };

  const handleFinalSubmit = () => {
    void submitForm();
  };

  useEffect(() => {
    if (chatStep !== 9) {
      setEditingReviewField(null);
    }
  }, [chatStep]);

  const openReviewEdit = (key: ReviewFieldKey) => {
    const f = formRef.current ?? form;
    setEditingReviewField(key);
    switch (key) {
      case 'event':
        setReviewEditDraft(f.eventType);
        break;
      case 'guests':
        setReviewEditDraft(String(f.guestCount));
        break;
      case 'date':
        setReviewEditDraft(f.eventDate);
        break;
      case 'budget':
        setReviewEditDraft(f.budgetRange);
        break;
      case 'phone':
        setReviewEditDraft(f.clientPhone);
        break;
      case 'time':
        setReviewEditDraft(f.eventTime === 'TBD' ? '' : f.eventTime);
        break;
      case 'address':
        setReviewEditDraft(f.venueAddress);
        break;
      case 'name':
        setReviewEditDraft(f.clientName);
        break;
      case 'email':
        setReviewEditDraft(f.clientEmail);
        break;
      default:
        setReviewEditDraft('');
    }
  };

  const commitReviewEdit = () => {
    const key = editingReviewField;
    if (!key) return;

    if (key === 'venue' || key === 'meal' || key === 'extras') {
      setEditingReviewField(null);
      return;
    }

    const draft = reviewEditDraft;
    switch (key) {
      case 'event':
        set('eventType', draft.trim());
        break;
      case 'guests': {
        const n = parseInt(draft, 10);
        if (!Number.isFinite(n) || n < 1) {
          toast.error('Please enter a valid number of guests');
          return;
        }
        set('guestCount', n);
        break;
      }
      case 'date':
        if (!draft.trim()) {
          toast.error('Please select a date');
          return;
        }
        set('eventDate', draft.trim());
        break;
      case 'budget':
        set('budgetRange', draft.trim());
        break;
      case 'phone':
        if (!draft.trim()) {
          toast.error('Please enter your phone number');
          return;
        }
        set('clientPhone', draft.trim());
        break;
      case 'time':
        set('eventTime', draft.trim() ? draft.trim() : 'TBD');
        break;
      case 'address':
        if (!draft.trim()) {
          toast.error('Please enter the event address or area');
          return;
        }
        set('venueAddress', draft.trim());
        break;
      case 'name':
        if (!draft.trim()) {
          toast.error('Please enter your name');
          return;
        }
        set('clientName', draft.trim());
        break;
      case 'email':
        if (!draft.trim()) {
          toast.error('Please enter your email');
          return;
        }
        set('clientEmail', draft.trim());
        break;
      default:
        break;
    }

    setEditingReviewField(null);
  };

  const handleStartOver = () => {
    if (window.confirm('Are you sure? This will restart the form.')) {
      setEditingReviewField(null);
      setChatStep(1);
    }
  };

  const renderSummaryRow = (fieldId: ReviewFieldKey, label: string, displayValue: string, editContent: ReactNode) => (
    <div
      key={fieldId}
      className={`iq-summary-preview-row ${editingReviewField === fieldId ? 'iq-summary-preview-row--editing' : ''}`}
    >
      <div className="iq-summary-preview-row-line">
        <span className="iq-summary-preview-key">{label}</span>
        {editingReviewField !== fieldId ? (
          <div className="iq-summary-preview-right">
            <span className="iq-summary-preview-val" title={displayValue}>
              {displayValue}
            </span>
            <button
              type="button"
              className="iq-review-edit-btn"
              onClick={() => openReviewEdit(fieldId)}
              aria-label={`Edit ${label}`}
            >
              <Pencil size={14} strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>
      {editingReviewField === fieldId ? <div className="iq-review-inline">{editContent}</div> : null}
    </div>
  );

  if (loading) {
    return (
      <div className={`iq-legacy-page ${themeIsDark ? '' : 'light'}`}>
        <div className="iq-legacy-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className={`iq-legacy-page ${themeIsDark ? '' : 'light'}`}>
        <div className="iq-legacy-header">
          <div className="iq-legacy-logo">
            ✦ Dream<span>Stage</span>
          </div>
          <button type="button" className="iq-theme-btn" onClick={toggleTheme}>
            {themeButtonLabel}
          </button>
        </div>
        <div className="iq-legacy-card" style={{ margin: 24 }}>
          <h1>Unable to open form</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (meta?.isSubmitted) {
    return (
      <div className={`iq-legacy-page ${themeIsDark ? '' : 'light'}`}>
        <div ref={cardRef} className="step-anim" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden />
        <div className="iq-legacy-header">
          <div className="iq-legacy-logo">
            ✦ Dream<span>Stage</span>
          </div>
          <button type="button" className="iq-theme-btn" onClick={toggleTheme}>
            {themeButtonLabel}
          </button>
        </div>
        <div className="iq-root" style={{ flex: 1, minHeight: 0 }}>
          <div className="iq-already-submitted">
            <div className="iq-success-icon">✓</div>
            <div className="iq-success-title">Inquiry already submitted</div>
            <p className="iq-success-sub">This inquiry link has already been used. Your planner has your details.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={cardRef} className="step-anim" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden />
      <div
        className={`iq-app ${themeIsDark ? '' : 'iq-app-light'}`}
        title={`DreamStage · ${STEP_LABELS.join(' → ')}`}
        data-budget-preset={String(budgetMatchesPreset)}
        data-lighting-preset={String(lightingIsPreset)}
        data-progress-hidden={String(progressHidden)}
        data-seating-style={SEATING_STYLES.map((s) => s.label).join('|')}
        data-event-types={EVENT_TYPES.join('|')}
      >
        <div className="iq-root">
          <aside className="iq-sidebar">
            <div className="iq-brand">
              <div className="iq-brand-icon">✨</div>
              <div>
                <div className="iq-brand-name">DreamStage</div>
                <div className="iq-brand-sub">Event Planning Platform</div>
              </div>
            </div>

            {meta?.plannerName ? (
              <div className="iq-planner-card">
                <div className="iq-planner-label">Your planner</div>
                <div className="iq-planner-name">{meta.plannerName}</div>
                <div className="iq-planner-tag">✓ Verified Event Planner</div>
              </div>
            ) : null}

            <div className="iq-progress-section">
              <div className="iq-progress-title">Your Progress</div>
              {STEP_LABELS_CHAT.map((label, i) => {
                const stepNum = i + 1;
                const state = chatStep > stepNum ? 'done' : chatStep === stepNum ? 'active' : 'inactive';
                return (
                  <div key={label}>
                    <div className="iq-step-row">
                      <div className={`iq-step-circle ${state}`}>{state === 'done' ? '✓' : stepNum}</div>
                      <div className={`iq-step-label ${state}`}>{label}</div>
                    </div>
                    {i < STEP_LABELS_CHAT.length - 1 ? <div className={`iq-connector ${chatStep > stepNum ? 'done' : ''}`} /> : null}
                  </div>
                );
              })}
            </div>

            {chatStep > 1 ? (
              <div className="iq-summary-card">
                <div className="iq-summary-title">✓ Collected so far</div>
                {form.eventType ? (
                  <div className="iq-summary-row">
                    <span className="iq-summary-key">Event</span>
                    <span className="iq-summary-val">{form.eventType}</span>
                  </div>
                ) : null}
                {form.guestCount > 0 && chatStep > 2 ? (
                  <div className="iq-summary-row">
                    <span className="iq-summary-key">Guests</span>
                    <span className="iq-summary-val">{form.guestCount}</span>
                  </div>
                ) : null}
                {form.eventDate && chatStep > 3 ? (
                  <div className="iq-summary-row">
                    <span className="iq-summary-key">Date</span>
                    <span className="iq-summary-val">
                      {new Date(form.eventDate + 'T12:00:00').toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ) : null}
                {form.venueType && chatStep > 4 ? (
                  <div className="iq-summary-row">
                    <span className="iq-summary-key">Venue</span>
                    <span className="iq-summary-val">{form.venueType}</span>
                  </div>
                ) : null}
                {form.budgetRange && chatStep > 5 ? (
                  <div className="iq-summary-row">
                    <span className="iq-summary-key">Budget</span>
                    <span className="iq-summary-val">{form.budgetRange}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="iq-sidebar-footer">
              <button type="button" className="iq-theme-btn" onClick={toggleTheme}>
                {themeButtonLabel}
              </button>
            </div>
          </aside>

          <div className="iq-main">
            <div className="iq-mobile-header">
              <div className="iq-mob-avatar">✨</div>
              <div>
                <div className="iq-mob-title">DreamStage Assistant</div>
                <div className="iq-mob-status">
                  <div className="iq-online-dot" />
                  {isAiTyping ? 'typing...' : meta?.plannerName ? `Planning with ${meta.plannerName}` : 'Online'}
                </div>
              </div>
              <div className="iq-mob-progress">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                  <div
                    key={s}
                    className={`iq-prog-pill ${chatStep > s ? 'done' : ''} ${chatStep === s ? 'active' : ''}`}
                  />
                ))}
              </div>
              <button type="button" className="iq-theme-btn iq-mob-theme" onClick={toggleTheme} aria-label="Toggle theme">
                {themeIsDark ? '☀️' : '🌙'}
              </button>
            </div>

            <div className="iq-chat-header iq-desktop-header">
              <div className="iq-chat-avatar">✨</div>
              <div>
                <div className="iq-chat-title">DreamStage Assistant</div>
                <div className="iq-chat-status">
                  <div className="iq-online-dot" />
                  {isAiTyping ? 'typing...' : meta?.plannerName ? `Planning with ${meta.plannerName}` : 'Online'}
                </div>
              </div>
            </div>

            {error && !approvedSuccess ? <div className="iq-inline-error">{error}</div> : null}

            {approvedSuccess ? (
              <div className="iq-success">
                <div className="iq-success-icon">🎉</div>
                <div className="iq-success-title">{successTitle}</div>
                <div className="iq-success-sub">
                  Your inquiry has been sent to your planner. They&apos;ll review your details and get back to you shortly!
                </div>
                <div className="iq-success-summary">{successMeta}</div>
              </div>
            ) : (
              <>
                <div className="iq-messages">
                  {messages.map((msg, i) => (
                    <div key={`${msg.time.getTime()}-${i}`} className={`iq-msg-row ${msg.type === 'client' ? 'client' : ''}`}>
                      {msg.type === 'ai' ? <div className="iq-msg-av">✨</div> : null}
                      <div className={`iq-bubble ${msg.type}`}>{msg.text}</div>
                    </div>
                  ))}

                  {isAiTyping ? (
                    <div className="iq-typing-row">
                      <div className="iq-msg-av">✨</div>
                      <div className="iq-typing-bubble">
                        <div className="iq-dot" />
                        <div className="iq-dot" />
                        <div className="iq-dot" />
                      </div>
                    </div>
                  ) : null}
                  <div ref={messagesEndRef} />
                </div>

                <div className="iq-input-area">
                  {chatStep === 1 && !awaitingCustomEventType ? (
                    <>
                      <div className="iq-input-label">Choose event type</div>
                      <div className="iq-chips">
                        {['💍 Wedding', '🌸 Mehndi', '🎂 Birthday', '💼 Corporate', '✨ Other'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="iq-chip"
                            onClick={() => handleEventType(t.split(' ').slice(1).join(' '))}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {awaitingCustomEventType ? (
                    <>
                      <div className="iq-input-label">Describe your event</div>
                      <input
                        type="text"
                        className="iq-chat-input"
                        placeholder="e.g. Graduation party, Anniversary, Engagement..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomEventType((e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="iq-continue-btn"
                        onClick={() => {
                          const input = document.querySelector('.iq-input-area input[type="text"]') as HTMLInputElement;
                          if (input) handleCustomEventType(input.value);
                        }}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 2 && !awaitingExactGuests ? (
                    <>
                      <div className="iq-input-label">Number of guests</div>
                      <div className="iq-chips">
                        {GUEST_OPTIONS.map((opt) => (
                          <button key={opt.label} type="button" className="iq-chip" onClick={() => handleGuestCount(opt.label, opt.count)}>
                            👥 {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {awaitingExactGuests ? (
                    <>
                      <div className="iq-input-label">Enter exact number of guests</div>
                      <input
                        type="number"
                        className="iq-chat-input"
                        placeholder="e.g. 75"
                        min={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleExactGuestCount(parseInt((e.target as HTMLInputElement).value, 10));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="iq-continue-btn"
                        onClick={() => {
                          const input = document.querySelector('.iq-input-area input[type="number"]') as HTMLInputElement;
                          if (input) handleExactGuestCount(parseInt(input.value, 10));
                        }}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 3 ? (
                    <>
                      <div className="iq-input-label">Pick your event date</div>
                      <input
                        ref={step3DateRef}
                        type="date"
                        className="iq-chat-input"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <button
                        type="button"
                        className="iq-continue-btn"
                        onClick={() => {
                          const el = step3DateRef.current;
                          if (!el?.value) {
                            toast.error('Please select a date');
                            return;
                          }
                          const d = new Date(`${el.value}T12:00:00`);
                          handleDate(
                            el.value,
                            d.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
                          );
                        }}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 4 && !awaitingCustomVenue ? (
                    <>
                      <div className="iq-input-label">Venue preference</div>
                      <div className="iq-chips">
                        {VENUE_TYPES.map((v) => (
                          <button key={v.label} type="button" className="iq-chip" onClick={() => handleVenueType(v.label)}>
                            {v.icon} {v.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {awaitingCustomVenue ? (
                    <>
                      <div className="iq-input-label">Where is your venue?</div>
                      <input
                        ref={customVenueInputRef}
                        type="text"
                        className="iq-chat-input"
                        placeholder="e.g. DHA garden, home in Gulberg, rooftop in Bahria..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomVenue((e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="iq-continue-btn"
                        onClick={() => {
                          const el = customVenueInputRef.current;
                          if (el) handleCustomVenue(el.value);
                        }}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 5 && awaitingExactBudget ? (
                    <>
                      <div className="iq-input-label">What&apos;s your total budget?</div>
                      <input
                        ref={exactBudgetInputRef}
                        type="number"
                        min={1}
                        step={1}
                        className="iq-chat-input"
                        placeholder="e.g. 250000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleExactBudget(Number((e.target as HTMLInputElement).value));
                          }
                        }}
                      />
                      <div className="iq-field-hint">Enter amount in PKR (Pakistani Rupees)</div>
                      <button
                        type="button"
                        className="iq-continue-btn"
                        onClick={() => {
                          const el = exactBudgetInputRef.current;
                          if (el) handleExactBudget(Number(el.value));
                        }}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 6 ? (
                    <>
                      <div className="iq-meal-section-label">Meal service</div>
                      <div className="iq-meal-options-grid">
                        {MEAL_OPTIONS.map((m) => {
                          const mealCardSelected =
                            form.mealPreference === m.label || form.mealPreference.startsWith(`${m.label} — `);
                          return (
                            <button
                              key={m.label}
                              type="button"
                              className={`iq-budget-card iq-meal-option-card ${mealCardSelected ? 'selected' : ''}`}
                              onClick={() => selectMealOption(m)}
                            >
                              <div className="iq-meal-option-head">
                                <span className="iq-meal-option-icon" aria-hidden>
                                  {m.icon}
                                </span>
                                <span className="iq-meal-option-title">{m.label}</span>
                              </div>
                              <div className="iq-meal-option-desc">{m.description}</div>
                            </button>
                          );
                        })}
                      </div>

                      {showMeatFollowUp ? (
                        <>
                          <div className="iq-input-label" style={{ marginTop: 4 }}>
                            Beef, chicken, or both?
                          </div>
                          <div className="iq-chips" style={{ marginBottom: 12 }}>
                            {(
                              [
                                { display: '🐄 Beef', value: 'Beef' },
                                { display: '🐔 Chicken', value: 'Chicken' },
                                { display: '🍖 Both', value: 'Both' },
                              ] as const
                            ).map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                className={`iq-chip ${
                                  form.mealPreference === `${mealBaseLabel} — ${c.value}` ? 'selected' : ''
                                }`}
                                onClick={() => set('mealPreference', `${mealBaseLabel} — ${c.value}`)}
                              >
                                {c.display}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}

                      {showCustomMenuInput ? (
                        <>
                          <div className="iq-input-label" style={{ marginTop: 4 }}>
                            Describe your menu or any preferences
                          </div>
                          <textarea
                            className="iq-chat-textarea"
                            rows={3}
                            placeholder="e.g. vegetarian options, regional dishes, allergies…"
                            value={customMenuDraft}
                            onChange={(e) => setCustomMenuDraft(e.target.value)}
                          />
                        </>
                      ) : null}

                      <div className="iq-meal-section-label">Extras (optional)</div>
                      <div className="iq-chips" style={{ marginBottom: 12 }}>
                        {ADDONS.map((a) => (
                          <button
                            key={a.label}
                            type="button"
                            className={`iq-chip ${form.addons.includes(a.label) ? 'selected' : ''}`}
                            onClick={() => {
                              const exists = form.addons.includes(a.label);
                              set('addons', exists ? form.addons.filter((x) => x !== a.label) : [...form.addons, a.label]);
                            }}
                          >
                            {a.icon} {a.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="iq-continue-btn"
                        disabled={!mealStepComplete}
                        onClick={handleMealStepContinue}
                      >
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 7 ? (
                    <>
                      <div className="iq-input-label">Phone & event info</div>
                      <input
                        type="tel"
                        className="iq-chat-input"
                        placeholder="Phone number *"
                        autoComplete="tel"
                        value={form.clientPhone}
                        onChange={(e) => set('clientPhone', e.target.value)}
                      />
                      <div className="iq-input-label" style={{ marginTop: 8 }}>
                        What time does your event start?
                      </div>
                      <input
                        type="time"
                        className="iq-chat-input"
                        value={form.eventTime === 'TBD' ? '' : form.eventTime}
                        onChange={(e) => set('eventTime', e.target.value)}
                      />
                      {showVenueAddressField ? (
                        <>
                          <div className="iq-input-label" style={{ marginTop: 8 }}>
                            Event address
                          </div>
                          <input
                            type="text"
                            className="iq-chat-input"
                            placeholder="Event address or area * (e.g. House 5, DHA Phase 3, Lahore)"
                            value={form.venueAddress}
                            onChange={(e) => set('venueAddress', e.target.value)}
                          />
                        </>
                      ) : null}
                      <button type="button" className="iq-continue-btn" onClick={handleContactExtrasDone}>
                        Continue →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 8 ? (
                    <>
                      <div className="iq-input-label">Your details</div>
                      <input
                        type="text"
                        className="iq-chat-input"
                        placeholder="Your full name *"
                        value={form.clientName}
                        onChange={(e) => set('clientName', e.target.value)}
                      />
                      <input
                        type="email"
                        className="iq-chat-input"
                        placeholder="Email address *"
                        value={form.clientEmail}
                        onChange={(e) => set('clientEmail', e.target.value)}
                      />
                      <textarea
                        className="iq-chat-textarea"
                        placeholder="Any special requests? (optional)"
                        rows={2}
                        value={form.specialRequests}
                        onChange={(e) => set('specialRequests', e.target.value)}
                      />
                      <button type="button" className="iq-continue-btn" onClick={handleContactDone}>
                        Review My Event →
                      </button>
                    </>
                  ) : null}

                  {chatStep === 9 ? (
                    <>
                      <div className="iq-summary-preview">
                        {renderSummaryRow('event', '🎉 Event', form.eventType, (
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow('guests', '👥 Guests', String(form.guestCount), (
                          <>
                            <input
                              type="number"
                              className="iq-chat-input iq-review-input"
                              min={1}
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow(
                          'date',
                          '📅 Date',
                          form.eventDate
                            ? new Date(`${form.eventDate}T12:00:00`).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : '—',
                          <>
                            <input
                              type="date"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        )}
                        {renderSummaryRow('venue', '🏛️ Venue', form.venueType || '—', (
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              readOnly
                              value={form.venueType}
                            />
                            <p className="iq-review-note">
                              To change venue, use the &quot;← Start Over&quot; button below.
                            </p>
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow('budget', '💰 Budget', form.budgetRange, (
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow('meal', '🍽️ Meal', form.mealPreference, (
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              readOnly
                              value={form.mealPreference}
                            />
                            <p className="iq-review-note">Go back to change meal.</p>
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow(
                          'extras',
                          '🎁 Extras',
                          form.addons.join(', ') || 'None',
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              readOnly
                              value={form.addons.join(', ') || 'None'}
                            />
                            <p className="iq-review-note">
                              To change extras, use the &quot;← Start Over&quot; button below.
                            </p>
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        )}
                        {renderSummaryRow('phone', '📞 Phone', form.clientPhone, (
                          <>
                            <input
                              type="tel"
                              className="iq-chat-input iq-review-input"
                              autoComplete="tel"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow('time', '⏰ Time', form.eventTime || 'TBD', (
                          <>
                            <input
                              type="time"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {form.venueAddress.trim()
                          ? renderSummaryRow('address', '📍 Address', form.venueAddress.trim(), (
                              <>
                                <input
                                  type="text"
                                  className="iq-chat-input iq-review-input"
                                  value={reviewEditDraft}
                                  onChange={(e) => setReviewEditDraft(e.target.value)}
                                />
                                <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                                  ✓ Save
                                </button>
                              </>
                            ))
                          : null}
                        {renderSummaryRow('name', '👤 Name', form.clientName, (
                          <>
                            <input
                              type="text"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                        {renderSummaryRow('email', '📧 Email', form.clientEmail, (
                          <>
                            <input
                              type="email"
                              className="iq-chat-input iq-review-input"
                              value={reviewEditDraft}
                              onChange={(e) => setReviewEditDraft(e.target.value)}
                            />
                            <button type="button" className="iq-review-save-btn" onClick={commitReviewEdit}>
                              ✓ Save
                            </button>
                          </>
                        ))}
                      </div>
                      <div className="iq-btn-row">
                        <button type="button" className="iq-edit-btn" onClick={handleStartOver}>
                          ← Start Over
                        </button>
                        <button type="button" className="iq-submit-btn" onClick={() => void handleFinalSubmit()} disabled={isSubmitting}>
                          {isSubmitting ? '⏳ Submitting...' : '✓ Submit Inquiry'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
