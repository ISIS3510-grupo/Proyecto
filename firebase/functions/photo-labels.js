// External service (Jhostin): Google Cloud Vision suggests the category and a
// short description for the photo of a lost item, before the report is sent.
// This module only turns the Vision annotation into a suggestion, so it can be
// tested without calling the API.

// Same ids as appConfig/general.categories and the Flutter fallback list.
const CATEGORY_KEYWORDS = {
  electronics: [
    "mobile phone", "smartphone", "phone", "laptop", "computer", "netbook",
    "tablet computer", "headphones", "headset", "earphones", "earbuds",
    "charger", "cable", "power bank", "computer mouse", "keyboard",
    "calculator", "camera", "speaker", "electronics", "electronic device",
    "gadget",
    "communication device", "portable communications device"
  ],
  documents: [
    "document", "paper", "identity document", "id card", "passport",
    "book", "notebook", "publication", "receipt", "card"
  ],
  keys: ["key", "keychain", "key chain", "lock"],
  bags: [
    "bag", "backpack", "handbag", "luggage", "baggage", "suitcase",
    "tote bag", "briefcase", "messenger bag", "shoulder bag"
  ],
  clothing: [
    "clothing", "jacket", "coat", "sweater", "sweatshirt", "hoodie",
    "shirt", "t-shirt", "outerwear", "sleeve", "jeans", "trousers", "cap",
    "hat", "scarf", "shoe", "footwear", "sneakers", "glove"
  ],
  accessories: [
    "glasses", "eyewear", "sunglasses", "watch", "jewellery", "jewelry",
    "wallet", "umbrella", "bottle", "water bottle", "ring", "bracelet",
    "necklace", "earrings"
  ]
};

const NAMED_COLORS = {
  black: [20, 20, 20], white: [240, 240, 240], gray: [128, 128, 128],
  red: [200, 30, 30], orange: [240, 140, 20], yellow: [240, 220, 30],
  green: [40, 150, 60], blue: [30, 80, 200], purple: [130, 50, 160],
  pink: [235, 120, 170], brown: [120, 75, 40]
};

// Below this Vision confidence a label is ignored.
const MIN_LABEL_SCORE = 0.6;
const MAX_KEYWORDS = 5;
const MAX_TEXT_LENGTH = 60;

// Whole-word match, so "key" matches "Car key" but not "Keyboard" or "Monkey".
function matchCategory(label) {
  const text = ` ${label.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(` ${keyword} `))) {
      return category;
    }
  }
  return null;
}

// Nearest named color by RGB distance, so "rgb(18,19,22)" becomes "black".
function nameColor(color) {
  if (!color) return null;
  const rgb = [color.red || 0, color.green || 0, color.blue || 0];
  let best = null;
  let bestDistance = Infinity;
  for (const [name, reference] of Object.entries(NAMED_COLORS)) {
    const distance = reference.reduce(
      (sum, value, i) => sum + (value - rgb[i]) ** 2, 0);
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}

function suggestFromAnnotation(annotation) {
  const labels = (annotation.labelAnnotations || [])
    .filter(label => (label.score || 0) >= MIN_LABEL_SCORE)
    .map(label => ({ description: label.description, score: label.score }));

  // Each category adds the confidence of the labels that point to it.
  const scores = {};
  let bestLabel = null;
  for (const label of labels) {
    const category = matchCategory(label.description);
    if (!category) continue;
    scores[category] = (scores[category] || 0) + label.score;
    if (!bestLabel) bestLabel = label.description.toLowerCase();
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const suggestedCategory = ranked.length ? ranked[0][0] : null;

  const colors =
    annotation.imagePropertiesAnnotation?.dominantColors?.colors || [];
  const dominant = [...colors].sort(
    (a, b) => (b.pixelFraction || 0) - (a.pixelFraction || 0))[0];
  const dominantColor = nameColor(dominant?.color);

  const rawText = (annotation.fullTextAnnotation?.text || "")
    .replace(/\s+/g, " ").trim();
  const detectedText = rawText ? rawText.slice(0, MAX_TEXT_LENGTH) : null;

  // "Black backpack"; without a clear object it falls back to "Blue item".
  const object = bestLabel || (dominantColor || detectedText ? "item" : null);
  const descriptionParts = [dominantColor, object].filter(Boolean);
  const suggestedDescription = descriptionParts.length
    ? capitalize(descriptionParts.join(" ")) +
      (detectedText ? `, with "${detectedText}" written on it` : "")
    : null;

  return {
    suggestedCategory,
    suggestedDescription,
    dominantColor,
    detectedText,
    keywords: labels.slice(0, MAX_KEYWORDS).map(label =>
      label.description.toLowerCase())
  };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
  CATEGORY_KEYWORDS,
  matchCategory,
  nameColor,
  suggestFromAnnotation
};
