import { BUSINESS } from "@/lib/constants";
import type { Product } from "@/types";
import type { CartLine } from "@/contexts/CartContext";

export function buildProductWhatsAppMessage(product: Product, quantity: number = 1) {
  const price = product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.price;
  const lines = [
    `Hello ${BUSINESS.name} - ${BUSINESS.slogan}`,
    ``,
    `I'd like to order:`,
    `Product: ${product.name}`,
    `Price: ${BUSINESS.currency}${price} per ${product.unit}`,
    `Quantity: ${quantity}`,
    `Total: ${BUSINESS.currency}${price * quantity}`,
    `Availability: ${product.trackInventory ? `${product.stock} left` : "Available"}`,
    ``,
    `Please confirm availability and delivery.`,
    ``,
    `Thank you!`,
  ];
  return lines.join("\n");
}

export function buildCartWhatsAppMessage(lines: CartLine[], subtotal: number, customer?: { name?: string; phone?: string; deliveryLocation?: string }) {
  const header = [
    `Hello ${BUSINESS.name} - ${BUSINESS.slogan}`,
    ``,
    `I'd like to place an order:`,
    ``,
  ];
  const items = lines.map((line) => `- ${line.name} (${line.unit}) x ${line.quantity} = ${BUSINESS.currency}${line.price * line.quantity}`).join("\n");
  const footer = [
    ``,
    `Subtotal: ${BUSINESS.currency}${subtotal}`,
    customer?.name ? `Name: ${customer.name}` : ``,
    customer?.phone ? `Phone: ${customer.phone}` : ``,
    customer?.deliveryLocation ? `Delivery Location: ${customer.deliveryLocation}` : ``,
    ``,
    `Please confirm availability and delivery to ${customer?.deliveryLocation || "my location"}.`,
    `Delivery info: ${BUSINESS.deliveryFree} ${BUSINESS.deliveryOther}`,
  ].filter(Boolean);
  return [...header, items, ...footer].join("\n");
}

export function getWhatsAppLink(message: string) {
  return `https://wa.me/${BUSINESS.whatsappLink}?text=${encodeURIComponent(message)}`;
}

export function getProductWhatsAppLink(product: Product, quantity: number = 1) {
  return getWhatsAppLink(buildProductWhatsAppMessage(product, quantity));
}

export function getCartWhatsAppLink(lines: CartLine[], subtotal: number, customer?: { name?: string; phone?: string; deliveryLocation?: string }) {
  return getWhatsAppLink(buildCartWhatsAppMessage(lines, subtotal, customer));
}
