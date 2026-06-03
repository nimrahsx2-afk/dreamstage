export const STEP_LABELS = ['About you', 'Venue', 'Food & extras', 'Budget'] as const;

export const EVENT_TYPES = ['Wedding', 'Mehndi', 'Birthday', 'Corporate', 'Other'] as const;

export const VENUE_TYPES = [
  { label: 'Banquet Hall', icon: '🏛️', desc: 'Indoor formal hall' },
  { label: 'Marquee / Tent', icon: '⛺', desc: 'Covered outdoor tent' },
  { label: 'Farmhouse', icon: '🌾', desc: 'Open rustic grounds' },
  { label: 'Hotel Ballroom', icon: '🏨', desc: 'Luxury hotel venue' },
  { label: 'Outdoor Garden', icon: '🌳', desc: 'Open-air greenery' },
  { label: 'Rooftop', icon: '🌆', desc: 'Elevated city views' },
  { label: 'Beach / Resort', icon: '🏖️', desc: 'Waterside setting' },
  { label: 'Home', icon: '🏠', desc: 'Private residence' },
  { label: 'Garden / Outdoor (Own)', icon: '🌿', desc: 'Your own outdoor space' },
  { label: 'Custom / Other', icon: '📍', desc: 'Something unique' },
] as const;

export const SEATING_STYLES = [
  { label: 'Banquet', icon: '🪑' },
  { label: 'Theatre', icon: '🎭' },
  { label: 'Cocktail', icon: '🍸' },
  { label: 'Custom', icon: '✏️' },
] as const;

export const MEAL_OPTIONS = [
  {
    label: 'Standard Buffet',
    icon: '🍽️',
    description: 'Chicken karahi, dal makhani, raita, naan, rice',
  },
  {
    label: 'Premium Buffet',
    icon: '👑',
    description: 'Mutton karahi, beef korma, biryani, BBQ station, 3 desserts, drinks',
  },
  {
    label: 'Daig / Deg Style',
    icon: '🪣',
    description: 'Traditional deg — chicken or beef, rice, naan, large-scale cooking for 200+ guests',
  },
  {
    label: 'Finger Food / Hi-Tea',
    icon: '☕',
    description: 'Sandwiches, samosas, pakoras, mini desserts, tea/coffee',
  },
  {
    label: 'Custom Menu',
    icon: '✏️',
    description: 'Coordinate directly with your planner',
  },
] as const;

export const ADDONS = [
  { label: 'Special lighting', icon: '💡' },
  { label: 'Custom decorations', icon: '🎨' },
  { label: 'Extra seating', icon: '🪑' },
  { label: 'Premium stage design', icon: '🎪' },
  { label: 'Floral arrangements', icon: '🌸' },
  { label: 'Photography', icon: '📸' },
  { label: 'Videography', icon: '🎥' },
  { label: 'Sound system', icon: '🔊' },
] as const;

export const BUDGETS = [
  'Under Rs. 50,000',
  'Rs. 50,000 – 150,000',
  'Rs. 150,000 – 300,000',
  'Rs. 300,000 – 500,000',
  'Above Rs. 500,000',
] as const;

export const LIGHTING = ['Basic', 'Fairy Lights', 'LED', 'Chandeliers', 'Custom'] as const;
