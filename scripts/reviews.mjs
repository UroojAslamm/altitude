// Sample reviews for the demo accounts. Every menu item gets two. All rows are marked is_seed.
export const REVIEWS = {
  'Espresso 20g': [[5, 'Short, strong, and gets me through a lecture.'], [4, 'Smooth with no bitter finish.']],
  'Espresso 32g': [[5, 'The longer pull suits me better.'], [4, 'Good crema and a proper kick.']],
  Americano: [[4, 'Simple and done right.'], [5, 'My default before an 8 AM.']],
  'Iced Americano': [[5, 'Clean and cold on a hot day.'], [4, 'Strong without being harsh.']],
  Cappuccino: [[5, 'Lovely thick foam.'], [4, 'A classic, well balanced.']],
  Piccolo: [[5, 'Tiny but it packs a punch.'], [4, 'Perfect quick stop between classes.']],
  Cortado: [[5, 'Just enough milk to take the edge off.'], [4, 'Great balance of coffee and milk.']],
  'Flat White': [[5, 'Silky milk every single time.'], [4, 'Smooth and not too big.']],
  'Cafe Latte': [[4, 'Easy to drink and always consistent.'], [5, 'Comfort in a cup during exam week.']],
  'Spanish Latte': [[5, 'Sweet in the best way.'], [4, 'A treat after a long day.']],
  'Iced Spanish Latte': [[5, 'Exactly what a 9 AM lab needs.'], [4, 'Reliable every time.']],
  'Iced Saffron Spanish Latte': [[5, 'The saffron is the whole point.'], [5, 'Nothing else on campus tastes like this.']],
  'Iced Pistachio Spanish Latte': [[5, 'Nutty, creamy, and not too sweet.'], [4, 'I keep coming back for this one.']],
  'Iced Rose Spanish Latte': [[4, 'Delicate rose flavour, really pretty drink.'], [5, 'Floral without tasting like soap.']],
  'Iced Dark Caramel Latte': [[5, 'Deep caramel with a slight bitter edge.'], [4, 'Rich and very satisfying.']],
  'Iced Nutella Latte': [[5, 'Dessert and coffee in one.'], [4, 'Sweet, but I am not complaining.']],
  'Iced Peanut Butter Latte': [[4, 'Sounded odd, tastes great.'], [5, 'Surprisingly my new favourite.']],
  'Iced Caramel Latte': [[4, 'Sweet and smooth.'], [5, 'Always hits after a long study session.']],
  'Iced Strawberry Latte': [[4, 'Tastes like strawberry milk with a kick.'], [5, 'Fun and refreshing.']],
  Affogato: [[5, 'Hot espresso over cold ice cream never fails.'], [5, 'The best way to end a long day.']],
  Chemex: [[5, 'So clean you can taste the beans.'], [4, 'Worth the short wait.']],
  V60: [[4, 'Clean and bright.'], [5, 'Light and fruity, just how I like it.']],
  Aeropress: [[5, 'Full body and very smooth.'], [4, 'A nice change from espresso.']],
  'Hot Chocolate': [[5, 'Thick and properly chocolatey.'], [4, 'Cosy on a cold classroom day.']],
  'Acai Smoothie': [[5, 'Fresh and filling.'], [4, 'Tastes healthy but still sweet.']],
  'Banana Chocolate Protein Shake': [[5, 'My go-to after the gym.'], [4, 'Thick and keeps me full until dinner.']],
  'Mango Mango': [[5, 'So much real mango.'], [5, 'Named it twice for a reason.']],
  'Berry Go Round Smoothie': [[5, 'Tart berries, really refreshing.'], [4, 'Bright flavour and not too sweet.']],
  "Pash n' Shoot Smoothie": [[5, 'Tastes like real fruit.'], [4, 'Tropical and sharp, I love it.']],
  'Strawberry Split Smoothie': [[4, 'Creamy and sweet.'], [5, 'Like a strawberry dessert in a cup.']],
  'Big 5 Smoothie': [[5, 'So much fruit in one drink.'], [4, 'The kiwi really comes through.']],
  Milkshake: [[5, 'Thick enough to need a good straw.'], [4, 'Went with chocolate, no regrets.']],
  'Rooibos Tea': [[4, 'Calm and naturally sweet.'], [5, 'Great when I have had too much coffee.']],
  'Green Tea': [[4, 'Light and clean.'], [5, 'A nice reset in the afternoon.']],
  'Black Tea': [[4, 'Strong, just how it should be.'], [5, 'Simple and always good.']],
  'Hibiscus Tea': [[5, 'Beautiful colour and a tart taste.'], [4, 'Different from the usual teas.']],
  'Iced Hibiscus Tea': [[5, 'The most refreshing thing on the menu.'], [4, 'Tart, cold, and perfect in the heat.']],
  'Matcha Latte': [[5, 'Smooth with no chalky taste.'], [4, 'Calm energy for a long afternoon.']],
  'Iced Matcha Latte': [[5, 'Earthy, creamy, and cold.'], [4, 'Better than I expected.']],
  'Acai Bowl': [[4, 'Filling between classes.'], [5, 'Great toppings and very fresh.']],
};

const AUTHORS = [[1, 'Aisha'], [2, 'Omar'], [3, 'Lina'], [4, 'Zayn']];

/** Rows for the reviews table. `student` turns 1 to 4 into a demo account id. */
export function reviewRows(byName, student) {
  return Object.entries(REVIEWS).flatMap(([item, reviews], i) => reviews.map(([rating, body], j) => {
    const [n, author_name] = AUTHORS[(i + j * 2) % AUTHORS.length];
    return { user_id: student(n), menu_item_id: byName[item].id, rating, body, author_name, is_seed: true };
  }));
}
