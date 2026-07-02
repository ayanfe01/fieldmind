import { TradeType } from './types';

export const SERVICE_CATEGORY_OPTIONS: { value: TradeType; label: string; icon: string }[] = [
  { value: 'plumber', label: 'Plumbing', icon: 'pipe-wrench' },
  { value: 'electrician', label: 'Electrical', icon: 'lightning-bolt-outline' },
  { value: 'hvac', label: 'HVAC', icon: 'air-conditioner' },
  { value: 'carpenter', label: 'Carpentry', icon: 'hammer' },
  { value: 'painter', label: 'Painting', icon: 'format-paint' },
  { value: 'roofer', label: 'Roofing', icon: 'home-roof' },
  { value: 'landscaper', label: 'Landscaping', icon: 'tree' },
  { value: 'engineer', label: 'Engineering', icon: 'account-hard-hat' },
  { value: 'hairstylist', label: 'Hair', icon: 'content-cut' },
  { value: 'tailor', label: 'Tailoring', icon: 'tape-measure' },
  { value: 'cobbler', label: 'Shoes', icon: 'shoe-formal' },
  { value: 'cleaner', label: 'Cleaning', icon: 'spray-bottle' },
  { value: 'mechanic', label: 'Auto', icon: 'car-wrench' },
  { value: 'makeup_artist', label: 'Makeup', icon: 'face-woman-shimmer-outline' },
  { value: 'photographer', label: 'Photography', icon: 'camera-outline' },
  { value: 'general', label: 'Repairs', icon: 'hammer-screwdriver' },
];

const normalizedOptions = SERVICE_CATEGORY_OPTIONS.map(option => ({
  ...option,
  normalized: option.label.trim().toLowerCase(),
}));

export function getServiceCategoryLabel(value?: TradeType, customCategory?: string) {
  if (customCategory?.trim()) return customCategory.trim();
  return SERVICE_CATEGORY_OPTIONS.find(option => option.value === value)?.label || 'General Services';
}

export function matchServiceCategory(input: string): TradeType {
  const normalized = input.trim().toLowerCase();
  const match = normalizedOptions.find(option => (
    option.normalized === normalized ||
    option.value === normalized ||
    option.normalized.replace(/s$/, '') === normalized.replace(/s$/, '')
  ));
  return match?.value || 'general';
}

export function getCustomServiceCategory(input: string) {
  const normalized = input.trim().toLowerCase();
  const match = normalizedOptions.find(option => (
    option.normalized === normalized ||
    option.value === normalized ||
    option.normalized.replace(/s$/, '') === normalized.replace(/s$/, '')
  ));
  return match ? undefined : input.trim();
}
