const test = require('node:test');
const assert = require('node:assert');

const {
  CATEGORY_KEYWORDS, matchCategory, nameColor, suggestFromAnnotation
} = require('./photo-labels');

const label = (description, score) => ({ description, score });

test('a backpack photo suggests bags with color and description', () => {
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [
      label('Backpack', 0.97), label('Bag', 0.91), label('Black', 0.85)
    ],
    imagePropertiesAnnotation: {
      dominantColors: {
        colors: [
          { color: { red: 230, green: 230, blue: 230 }, pixelFraction: 0.1 },
          { color: { red: 18, green: 19, blue: 22 }, pixelFraction: 0.6 }
        ]
      }
    }
  });

  assert.strictEqual(suggestion.suggestedCategory, 'bags');
  assert.strictEqual(suggestion.dominantColor, 'black');
  assert.strictEqual(suggestion.suggestedDescription, 'Black backpack');
  assert.deepStrictEqual(suggestion.keywords, ['backpack', 'bag', 'black']);
});

test('the category with more confidence wins over the first match', () => {
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [
      label('Watch', 0.7), label('Laptop', 0.95), label('Computer', 0.9)
    ]
  });
  assert.strictEqual(suggestion.suggestedCategory, 'electronics');
});

test('low confidence labels are ignored', () => {
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [label('Key', 0.3), label('Floor', 0.9)]
  });
  assert.strictEqual(suggestion.suggestedCategory, null);
  assert.deepStrictEqual(suggestion.keywords, ['floor']);
});

test('visible text is added to the description and trimmed', () => {
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [label('Water bottle', 0.92)],
    fullTextAnnotation: { text: 'HYDRO\nFLASK   ' + 'x'.repeat(100) }
  });
  assert.strictEqual(suggestion.suggestedCategory, 'accessories');
  assert.strictEqual(suggestion.detectedText.length, 60);
  assert.match(suggestion.suggestedDescription,
    /^Water bottle, with "HYDRO FLASK x+" written on it$/);
});

test('an empty annotation gives an empty suggestion', () => {
  assert.deepStrictEqual(suggestFromAnnotation({}), {
    suggestedCategory: null,
    suggestedDescription: null,
    dominantColor: null,
    detectedText: null,
    keywords: []
  });
});

test('named colors and category ids match the app', () => {
  assert.strictEqual(nameColor({ red: 30, green: 70, blue: 210 }), 'blue');
  assert.strictEqual(nameColor(undefined), null);
  assert.strictEqual(matchCategory('Mobile phone'), 'electronics');
  assert.deepStrictEqual(Object.keys(CATEGORY_KEYWORDS).sort(), [
    'accessories', 'bags', 'clothing', 'documents', 'electronics', 'keys'
  ]);
});

test('keywords match whole words only', () => {
  assert.strictEqual(matchCategory('Car key'), 'keys');
  assert.strictEqual(matchCategory('Keyboard'), 'electronics');
  assert.strictEqual(matchCategory('Monkey'), null);
  assert.strictEqual(matchCategory('Landscape'), null);
  assert.strictEqual(matchCategory('T-shirt'), 'clothing');
});

test('the live answer for a calculator photo maps to electronics', () => {
  // Labels Vision returned for a blue photo with "CASIO fx-570" written on it.
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [
      label('Number', 0.83), label('Font', 0.8), label('Technology', 0.7),
      label('Electronics', 0.66)
    ],
    imagePropertiesAnnotation: {
      dominantColors: {
        colors: [{ color: { red: 13, green: 51, blue: 191 }, pixelFraction: 0.9 }]
      }
    },
    fullTextAnnotation: { text: 'CASIO fx-570' }
  });

  assert.strictEqual(suggestion.suggestedCategory, 'electronics');
  assert.strictEqual(suggestion.suggestedDescription,
    'Blue electronics, with "CASIO fx-570" written on it');
});

test('without a known object the description says item', () => {
  const suggestion = suggestFromAnnotation({
    labelAnnotations: [label('Floor', 0.9)],
    fullTextAnnotation: { text: 'ANA' }
  });
  assert.strictEqual(suggestion.suggestedDescription,
    'Item, with "ANA" written on it');
});
