import React from 'react';
import {
  Utensils, Pizza, Coffee, Beer, Cake, Soup,
  ShoppingCart, ShoppingBag, Gift, Shirt, Footprints, Scissors,
  Home, Building2, Hotel, Lightbulb, Zap, Droplets, Wrench, Hammer, WashingMachine,
  Car, Bus, Train, Plane, Bike, Ship, Fuel, MapPin,
  Stethoscope, Pill, Dumbbell, Bath, HeartPulse,
  Music, Gamepad2, Tv, Clapperboard, Film, Camera, Headphones, Mic, Palette, Trophy,
  Laptop, Smartphone, Wifi, Phone, Monitor,
  BookOpen, GraduationCap, Briefcase, Landmark,
  Dog, Cat, Leaf, Waves, Umbrella, Tent, Baby,
  Wallet, Banknote, CreditCard, PiggyBank, Receipt, TrendingUp, TrendingDown,
  Heart, Star, Package, Plus, ArrowRightLeft,
  Bell, Users, Handshake, BarChart3, LineChart, RefreshCw, Target, Settings,
  Globe, LogOut, Key, Mail, MailCheck, AlertTriangle, CalendarClock, Coins,
  ReceiptText, ShieldCheck, Mountain, Sailboat, Gem, Palmtree,
  type LucideProps,
} from 'lucide-react-native';

/**
 * Icons are stored in the database by Lucide component name (e.g. "Utensils"),
 * which is what the web app writes too — so both clients render the same thing.
 * Imports are explicit rather than `import *` to keep the bundle small.
 */
const REGISTRY = {
  Utensils, Pizza, Coffee, Beer, Cake, Soup,
  ShoppingCart, ShoppingBag, Gift, Shirt, Footprints, Scissors,
  Home, Building2, Hotel, Lightbulb, Zap, Droplets, Wrench, Hammer, WashingMachine,
  Car, Bus, Train, Plane, Bike, Ship, Fuel, MapPin,
  Stethoscope, Pill, Dumbbell, Bath, HeartPulse,
  Music, Gamepad2, Tv, Clapperboard, Film, Camera, Headphones, Mic, Palette, Trophy,
  Laptop, Smartphone, Wifi, Phone, Monitor,
  BookOpen, GraduationCap, Briefcase, Landmark,
  Dog, Cat, Leaf, Waves, Umbrella, Tent, Baby,
  Wallet, Banknote, CreditCard, PiggyBank, Receipt, TrendingUp, TrendingDown,
  Heart, Star, Package, Plus, ArrowRightLeft,
  Bell, Users, Handshake, BarChart3, LineChart, RefreshCw, Target, Settings,
  Globe, LogOut, Key, Mail, MailCheck, AlertTriangle, CalendarClock, Coins,
  ReceiptText, ShieldCheck, Mountain, Sailboat, Gem, Palmtree,
} satisfies Record<string, React.ComponentType<LucideProps>>;

export type IconName = keyof typeof REGISTRY;

/** Names offered in the icon picker, grouped so the grid reads sensibly. */
export const PICKER_ICONS: IconName[] = [
  'Utensils', 'Pizza', 'Coffee', 'Beer', 'Cake', 'Soup',
  'ShoppingCart', 'ShoppingBag', 'Gift', 'Shirt', 'Footprints', 'Scissors',
  'Home', 'Building2', 'Hotel', 'Lightbulb', 'Zap', 'Droplets',
  'Wrench', 'Hammer', 'WashingMachine',
  'Car', 'Bus', 'Train', 'Plane', 'Bike', 'Ship', 'Fuel', 'MapPin',
  'Stethoscope', 'Pill', 'Dumbbell', 'Bath', 'HeartPulse',
  'Music', 'Gamepad2', 'Tv', 'Clapperboard', 'Film', 'Camera',
  'Headphones', 'Mic', 'Palette', 'Trophy',
  'Laptop', 'Smartphone', 'Wifi', 'Phone', 'Monitor',
  'BookOpen', 'GraduationCap', 'Briefcase', 'Landmark',
  'Dog', 'Cat', 'Leaf', 'Waves', 'Umbrella', 'Tent', 'Baby',
  'Wallet', 'Banknote', 'CreditCard', 'PiggyBank', 'Receipt',
  'Heart', 'Star', 'Package',
];

/** Fallback used when a stored name is unknown — including legacy emoji values. */
const DEFAULT_ICON: IconName = 'Wallet';

function resolve(name: string | null | undefined): IconName {
  if (name && name in REGISTRY) return name as IconName;
  return DEFAULT_ICON;
}

export function isKnownIcon(name: string | null | undefined): boolean {
  return !!name && name in REGISTRY;
}

interface IconProps {
  name: string | null | undefined;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = '#000', strokeWidth = 1.9 }: IconProps) {
  const Component = REGISTRY[resolve(name)];
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
}

/**
 * Which icon to show for a transaction.  Prefers the icon stored on the row,
 * then a sensible default per type, then the category name — older rows may
 * carry an emoji or nothing at all.
 */
const CATEGORY_FALLBACK: Record<string, IconName> = {
  food: 'Utensils',
  home: 'Home',
  transport: 'Car',
  health: 'HeartPulse',
  leisure: 'Gamepad2',
  entertainment: 'Music',
  shopping: 'ShoppingCart',
  education: 'BookOpen',
  travel: 'Plane',
  services: 'Wrench',
  income: 'Banknote',
};

export function transactionIcon(
  icon: string | null | undefined,
  type?: string | null,
  category?: string | null,
): IconName {
  if (isKnownIcon(icon)) return icon as IconName;
  if (type === 'transfer') return 'ArrowRightLeft';
  if (type === 'income') return 'Banknote';
  const key = category?.toLowerCase() ?? '';
  return CATEGORY_FALLBACK[key] ?? 'Receipt';
}
