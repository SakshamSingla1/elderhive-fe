import React from "react";
import type { IconType } from "react-icons";
import { FiDollarSign, FiFileText, FiHome, FiMonitor, FiShoppingCart, FiTag, FiTruck, FiUsers, FiWind } from "react-icons/fi";
import { FaCut, FaHospital, FaPaw, FaPills, FaWalking } from "react-icons/fa";
import { GiBroom, GiTempleGate } from "react-icons/gi";

// ServiceCategory.icon (Prompt 71) is a free-text string with no fixed enum, but every
// category this app actually ships with (see ServiceCategorySeeder) names one of these
// everyday care-service themes - curating a fixed picker here (rather than leaving the
// field a raw text box no one can preview) gives every category a real, recognizable
// glyph in both the admin form and every listing card that renders it, while still
// storing nothing more than the same plain string on the wire.
export interface CategoryIconOption {
  value: string;
  label: string;
  Icon: IconType;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { value: "temple", label: "Temple Visit", Icon: GiTempleGate },
  { value: "hospital", label: "Hospital Visit", Icon: FaHospital },
  { value: "grocery", label: "Grocery Shopping", Icon: FiShoppingCart },
  { value: "companion", label: "Companionship", Icon: FiUsers },
  { value: "medication", label: "Medication", Icon: FaPills },
  { value: "physiotherapy", label: "Physiotherapy", Icon: FaWalking },
  { value: "transport", label: "Transport", Icon: FiTruck },
  { value: "home", label: "Home Help", Icon: FiHome },
  { value: "cleaning", label: "Cleaning", Icon: GiBroom },
  { value: "legal", label: "Legal / Admin", Icon: FiFileText },
  { value: "finance", label: "Finance", Icon: FiDollarSign },
  { value: "pet", label: "Pet Care", Icon: FaPaw },
  { value: "beauty", label: "Grooming", Icon: FaCut },
  { value: "tech", label: "Tech Help", Icon: FiMonitor },
  { value: "general", label: "General", Icon: FiWind },
];

const ICON_BY_VALUE = new Map(CATEGORY_ICON_OPTIONS.map((option) => [option.value, option.Icon]));

/** Matches a free-text icon slug (exact, then substring-contains either way) to a curated
 *  icon, falling back to a generic tag for anything unrecognized - old data, a category
 *  made before this picker existed, or a value typed directly via the API. */
export function resolveCategoryIcon(icon?: string | null): IconType {
  if (!icon) return FiTag;
  const normalized = icon.trim().toLowerCase();
  const exact = ICON_BY_VALUE.get(normalized);
  if (exact) return exact;
  const partial = CATEGORY_ICON_OPTIONS.find((option) => normalized.includes(option.value) || option.value.includes(normalized));
  return partial?.Icon ?? FiTag;
}

export const CategoryIconGlyph: React.FC<{ icon?: string | null; size?: number }> = ({ icon, size = 18 }) => {
  const Icon = resolveCategoryIcon(icon);
  return <Icon size={size} />;
};
