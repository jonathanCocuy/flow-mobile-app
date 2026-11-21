import React from 'react';
import {
  // Comida & Bebida
  Utensils, Pizza, Coffee, Beer, Cake, Soup,
  ChefHat, Apple, Wine, Cookie, Sandwich, IceCream, Beef, Carrot,
  // Compras & Moda
  ShoppingCart, ShoppingBag, Gift, Shirt, Footprints, Scissors,
  Tag, Backpack, Store, Watch, ShoppingBasket, Glasses,
  // Hogar & Servicios
  Home, Building2, Hotel, Lightbulb, Zap, Droplets, Wrench, Hammer, WashingMachine,
  Sofa, Thermometer, Flame, Plug, Paintbrush, Microwave,
  // Transporte
  Car, Bus, Train, Plane, Bike, Ship, Fuel, MapPin,
  Truck, Navigation, Route, Anchor, Gauge,
  // Salud & Fitness
  Stethoscope, Pill, Dumbbell, Bath, HeartPulse,
  Activity, Syringe, Brain, Eye, FlaskConical,
  // Entretenimiento & Hobbies
  Music, Gamepad2, Tv, Clapperboard, Film, Camera, Headphones, Mic, Palette, Trophy,
  Guitar, Radio, Dice5, Ticket, PartyPopper, Sparkles,
  // Tecnología
  Laptop, Smartphone, Wifi, Phone, Monitor,
  Keyboard, Mouse, HardDrive, Cpu, Server, Printer,
  // Educación & Trabajo
  BookOpen, GraduationCap, Briefcase, Landmark,
  Pencil, FileText, FolderOpen, Clipboard, Award, School, Medal,
  // Naturaleza & Viajes
  Dog, Cat, Leaf, Waves, Umbrella, Tent, Baby,
  Sun, Moon, Cloud, Snowflake, Flower2, TreePine, Compass, Sprout,
  // Finanzas
  Wallet, Banknote, CreditCard, PiggyBank, Receipt, TrendingUp, TrendingDown,
  CircleDollarSign, DollarSign, Percent, Calculator, Vault,
  // General / Sistema
  Heart, Star, Package, Plus, ArrowRightLeft,
  Clock, Calendar, Flag, Bookmark, Crown, Smile, Timer,
  Bell, Users, Handshake, BarChart3, LineChart, RefreshCw, Target, Settings,
  Globe, LogOut, Key, Mail, MailCheck, AlertTriangle, CalendarClock, Coins,
  ReceiptText, ShieldCheck, Mountain, Sailboat, Gem, Palmtree,
  X, Check, CheckCircle, Info, TriangleAlert,
  Lock, Trash2, HandCoins, Download, FileUp,
  type LucideProps,
} from 'lucide-react-native';

/**
 * Icons are stored in the database by Lucide component name (e.g. "Utensils"),
 * which is what the web app writes too — so both clients render the same thing.
 * Imports are explicit rather than `import *` to keep the bundle small.
 */
const REGISTRY = {
  // Comida & Bebida
  Utensils, Pizza, Coffee, Beer, Cake, Soup,
  ChefHat, Apple, Wine, Cookie, Sandwich, IceCream, Beef, Carrot,
  // Compras & Moda
  ShoppingCart, ShoppingBag, Gift, Shirt, Footprints, Scissors,
  Tag, Backpack, Store, Watch, ShoppingBasket, Glasses,
  // Hogar & Servicios
  Home, Building2, Hotel, Lightbulb, Zap, Droplets, Wrench, Hammer, WashingMachine,
  Sofa, Thermometer, Flame, Plug, Paintbrush, Microwave,
  // Transporte
  Car, Bus, Train, Plane, Bike, Ship, Fuel, MapPin,
  Truck, Navigation, Route, Anchor, Gauge,
  // Salud & Fitness
  Stethoscope, Pill, Dumbbell, Bath, HeartPulse,
  Activity, Syringe, Brain, Eye, FlaskConical,
  // Entretenimiento & Hobbies
  Music, Gamepad2, Tv, Clapperboard, Film, Camera, Headphones, Mic, Palette, Trophy,
  Guitar, Radio, Dice5, Ticket, PartyPopper, Sparkles,
  // Tecnología
  Laptop, Smartphone, Wifi, Phone, Monitor,
  Keyboard, Mouse, HardDrive, Cpu, Server, Printer,
  // Educación & Trabajo
  BookOpen, GraduationCap, Briefcase, Landmark,
  Pencil, FileText, FolderOpen, Clipboard, Award, School, Medal,
  // Naturaleza & Viajes
  Dog, Cat, Leaf, Waves, Umbrella, Tent, Baby,
  Sun, Moon, Cloud, Snowflake, Flower2, TreePine, Compass, Sprout,
  // Finanzas
  Wallet, Banknote, CreditCard, PiggyBank, Receipt, TrendingUp, TrendingDown,
  CircleDollarSign, DollarSign, Percent, Calculator, Vault,
  // General / Sistema
  Heart, Star, Package, Plus, ArrowRightLeft,
  Clock, Calendar, Flag, Bookmark, Crown, Smile, Timer,
  Bell, Users, Handshake, BarChart3, LineChart, RefreshCw, Target, Settings,
  Globe, LogOut, Key, Mail, MailCheck, AlertTriangle, CalendarClock, Coins,
  ReceiptText, ShieldCheck, Mountain, Sailboat, Gem, Palmtree,
  // UI icons (not in picker, used for close/check/info/settings controls)
  X, Check, CheckCircle, Info, TriangleAlert,
  Lock, Trash2, HandCoins, Download, FileUp,
} satisfies Record<string, React.ComponentType<LucideProps>>;

export type IconName = keyof typeof REGISTRY;

/** Names offered in the icon picker, grouped so the grid reads sensibly. */
export const PICKER_ICONS: IconName[] = [
  // Comida & Bebida
  'Utensils', 'Pizza', 'Coffee', 'Beer', 'Cake', 'Soup',
  'ChefHat', 'Apple', 'Wine', 'Cookie', 'Sandwich', 'IceCream', 'Beef', 'Carrot',
  // Compras & Moda
  'ShoppingCart', 'ShoppingBag', 'Gift', 'Shirt', 'Footprints', 'Scissors',
  'Tag', 'Backpack', 'Store', 'Watch', 'ShoppingBasket', 'Glasses',
  // Hogar & Servicios
  'Home', 'Building2', 'Hotel', 'Lightbulb', 'Zap', 'Droplets',
  'Wrench', 'Hammer', 'WashingMachine', 'Sofa', 'Thermometer', 'Flame', 'Plug', 'Paintbrush', 'Microwave',
  // Transporte
  'Car', 'Bus', 'Train', 'Plane', 'Bike', 'Ship', 'Fuel', 'MapPin',
  'Truck', 'Navigation', 'Route', 'Anchor', 'Gauge',
  // Salud & Fitness
  'Stethoscope', 'Pill', 'Dumbbell', 'Bath', 'HeartPulse',
  'Activity', 'Syringe', 'Brain', 'Eye', 'FlaskConical',
  // Entretenimiento & Hobbies
  'Music', 'Gamepad2', 'Tv', 'Clapperboard', 'Film', 'Camera',
  'Headphones', 'Mic', 'Palette', 'Trophy',
  'Guitar', 'Radio', 'Dice5', 'Ticket', 'PartyPopper', 'Sparkles',
  // Tecnología
  'Laptop', 'Smartphone', 'Wifi', 'Phone', 'Monitor',
  'Keyboard', 'Mouse', 'HardDrive', 'Cpu', 'Server', 'Printer',
  // Educación & Trabajo
  'BookOpen', 'GraduationCap', 'Briefcase', 'Landmark',
  'Pencil', 'FileText', 'FolderOpen', 'Clipboard', 'Award', 'School', 'Medal',
  // Naturaleza & Viajes
  'Dog', 'Cat', 'Leaf', 'Waves', 'Umbrella', 'Tent', 'Baby',
  'Sun', 'Moon', 'Cloud', 'Snowflake', 'Flower2', 'TreePine', 'Compass', 'Sprout',
  // Finanzas
  'Wallet', 'Banknote', 'CreditCard', 'PiggyBank', 'Receipt',
  'CircleDollarSign', 'DollarSign', 'Percent', 'Calculator', 'Vault',
  // General
  'Heart', 'Star', 'Package',
  'Clock', 'Calendar', 'Flag', 'Bookmark', 'Crown', 'Smile', 'Timer',
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
