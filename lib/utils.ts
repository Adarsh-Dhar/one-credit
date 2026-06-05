import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Infer category intelligently from product name
export function inferCategory(productName: string, merchant: string): string {
  const name = productName.toLowerCase()
  if (/date|dry fruit|nuts|cashew|almond|raisin|walnut|apricot|fig|pista/.test(name)) {
return 'grocery'
}
  if (/rice|dal|flour|oil|sugar|salt|spice|masala|pulses|atta/.test(name)) {
return 'grocery'
}
  if (/biscuit|cookie|chocolate|candy|snack|chips|popcorn/.test(name)) {
return 'grocery'
}
  if (/milk|curd|paneer|cheese|butter|ghee|cream/.test(name)) {
return 'grocery'
}
  if (/shampoo|soap|toothpaste|facewash|moisturizer|sunscreen/.test(name)) {
return 'personal care'
}
  if (/phone|mobile|laptop|tablet|earphone|headphone|charger|cable|speaker|camera/.test(name)) {
return 'electronics'
}
  if (/shirt|pant|jeans|dress|saree|kurta|jacket|shoe|sandal/.test(name)) {
return 'fashion'
}
  if (/book|novel|textbook|guide|comics/.test(name)) {
return 'books'
}
  if (/flight|hotel|train|bus|cab|tour/.test(name)) {
return 'travel'
}
  if (/restaurant|food delivery|zomato|swiggy/.test(name)) {
return 'dining'
}
  if (/gym|yoga|fitness|protein|supplement/.test(name)) {
return 'fitness'
}
  if (/netflix|hotstar|prime|spotify|zee5/.test(name)) {
return 'streaming'
}
  if (/petrol|diesel|fuel/.test(name)) {
return 'gas'
}
  if (/medicine|tablet|capsule|syrup|health/.test(name)) {
return 'drug'
}
  if (merchant.includes('amazon')) {
return 'shopping'
}
  return 'shopping'
}
