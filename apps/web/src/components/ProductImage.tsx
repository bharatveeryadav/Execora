/**
 * ProductImage — displays product image with fallback.
 * Uses imageUrls map from useProductImageUrls when product.imageUrl is an object key.
 */
import { type Product } from "@/lib/api";

interface Props {
  product: Product;
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

const categoryEmoji: Record<string, string> = {
  dairy: "🥛",
  grocery: "🌾",
  oil: "🫙",
  personal: "🧴",
  beverage: "☕",
  snack: "🍪",
  vegetable: "🥦",
  fruit: "🍎",
  pharma: "💊",
  default: "📦",
};

function getPlaceholder(product: Product): string {
  if (!product.category) return categoryEmoji.default;
  const c = product.category.toLowerCase();
  if (c.includes("dairy") || c.includes("milk")) return categoryEmoji.dairy;
  if (c.includes("grocery") || c.includes("grain") || c.includes("atta") || c.includes("rice"))
    return categoryEmoji.grocery;
  if (c.includes("oil") || c.includes("ghee")) return categoryEmoji.oil;
  if (c.includes("personal") || c.includes("beauty") || c.includes("soap")) return categoryEmoji.personal;
  if (c.includes("beverag") || c.includes("drink") || c.includes("tea") || c.includes("coffee"))
    return categoryEmoji.beverage;
  if (c.includes("snack") || c.includes("biscuit") || c.includes("chips")) return categoryEmoji.snack;
  if (c.includes("vegetable") || c.includes("sabzi")) return categoryEmoji.vegetable;
  if (c.includes("fruit")) return categoryEmoji.fruit;
  if (c.includes("pharma") || c.includes("medicine")) return categoryEmoji.pharma;
  return categoryEmoji.default;
}

export function ProductImage({ product, imageUrl, className = "", size = "md" }: Props) {
  const resolvedUrl =
    imageUrl ?? (product.imageUrl?.startsWith("http") ? product.imageUrl : null);
  const placeholder = getPlaceholder(product);

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={product.name}
        className={`${sizeClasses[size]} rounded-md object-cover bg-muted ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-md bg-muted text-lg ${className}`}
      title={product.name}
    >
      {placeholder}
    </div>
  );
}
