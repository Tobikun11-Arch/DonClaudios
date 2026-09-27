import {scanText} from '../api/utils/profanityFilter';

const FIXTURES: {label: string; comment: string}[] = [
  {label: 'clean english', comment: 'Lechon was perfect, staff were so nice!'},
  {label: 'clean tagalog', comment: 'Masarap ang litsa, sulit yun sa presyo!'},
  {label: 'legit complaint', comment: 'Cold ang karne, late din ang delivery.'},
  {
    label: 'Scunthorpe guard',
    comment: 'Classic taste, the gravy was assassin good. Hello there!'
  },
  {label: 'mild tagalog insult', comment: 'Gago ang pagkain dito, bulok.'},
  {label: 'mild english insult', comment: 'The cashier was a total idiot.'},
  {label: 'severe tagalog', comment: 'T a n g i n a ang pagkain nyo!'},
  {label: 'severe english', comment: 'this fucking food is garbage'},
  {label: 'leetspeak', comment: 'sh1t ang lasa, 1t1s g4go'},
  {label: 'separators', comment: 'f.u.c.k this place, b*b*'},
  {label: 'repeats', comment: 'fuuuuck, ang baaaad ng loob'},
  {label: 'diacritics', comment: 'Tángina, maliit na ito'},
  {label: 'phrase', comment: 'gago ka magsabi ka ng gago'},
  {label: 'letter spaced', comment: 'f u c k ang service'},
  {label: 'spaced phrase', comment: 'tang ina nyo'},
  {label: 'phrase not substring', comment: 'Tangi na, tayo na sa GigaMall.'},
  {label: 'allowlisted name', comment: 'Titi Maria recommended this to me, 5 stars'},
  {label: 'exclamation mark', comment: 'Ang gago ninyo, tangina!'},
  {label: 'punctuation kept', comment: '"tangina" (seriously), 1/5'},
  {label: 'symbol leet infix', comment: 'g@g0 ang pagkain, sh!t'},
  {label: 'inflection', comment: 'TANGINAS mo, gagos ka'},
  {label: 'numbers survive', comment: 'P150 for 3 pieces, 24/7 open'},
  {label: 'disabled', comment: 'tangina'}
];

async function main() {
  for (const {label, comment} of FIXTURES) {
    const scan = scanText(comment);
    console.log(
      `${label.padEnd(24)} -> ${scan.action.padEnd(11)} score=${scan.score} terms=[${scan.terms.join(', ')}]`
    );
  }
}

main();
