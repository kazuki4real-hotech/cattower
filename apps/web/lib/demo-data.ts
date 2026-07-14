export const images = {
  window:
    "https://images.unsplash.com/photo-1686615508052-843d45a94e22?auto=format&fit=crop&w=1400&q=84",
  toy: "https://images.unsplash.com/photo-1729008764855-9b5257318beb?auto=format&fit=crop&w=1200&q=84",
  food: "https://images.unsplash.com/photo-1652410817793-e9c5644fe436?auto=format&fit=crop&w=1200&q=84",
} as const;

export const shelves = [
  ["写真と動画", "48の記録"],
  ["ことば", "21の記録"],
  ["おもちゃ", "8の記録"],
  ["ご飯", "12の記録"],
  ["記念日", "6の記録"],
] as const;

export const templates = [
  ["photo_camera", "何気ない瞬間", "写真、動画、または短い文章で、いつもの一場面を。", "本文またはメディア"],
  ["menu_book", "今日のひとこと", "呼び名、寝言、ふと思ったことを言葉だけで。", "本文"],
  ["toys", "好きなもの図鑑", "おもちゃや箱、毛布。遊び方も一緒に収蔵。", "名前と種類"],
  ["restaurant", "ご飯メモ", "味、食いつき、また買いたいかを忘れないために。", "商品名または自由名"],
  ["auto_awesome", "はじめて・記念日", "迎えた日や初めてできたことを、日付と一緒に。", "タイトルと日付"],
  ["photo_library", "くらべる", "似た二枚を並べて、変わったことと変わらないことを。", "2件のメディア"],
] as const;
