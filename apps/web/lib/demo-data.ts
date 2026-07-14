export const images = {
  window:
    "https://images.unsplash.com/photo-1686615508052-843d45a94e22?auto=format&fit=crop&w=1400&q=84",
  toy: "https://images.unsplash.com/photo-1729008764855-9b5257318beb?auto=format&fit=crop&w=1200&q=84",
  food: "https://images.unsplash.com/photo-1652410817793-e9c5644fe436?auto=format&fit=crop&w=1200&q=84",
} as const;

export const boards = [
  ["窓辺の時間", "12の記録", images.window],
  ["お気に入り", "7の記録", images.toy],
] as const;
