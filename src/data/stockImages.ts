// Stock image data for background polaroids
export const stockImages = [
  {
    id: "stock1",
    src: "/login_images/post_3f2f3114_img_00.jpg",
    caption: "What meow?",
    date: "07/15/2022",
  },
  {
    id: "stock2",
    src: "/login_images/post_47d25085_img_04.jpg",
    caption: "My favorite spot",
    date: "03/22/2022",
  },
  {
    id: "stock3",
    src: "/login_images/post_5d89f6b9_img_02.jpg",
    caption: "Breakfast for Dinner",
    date: "06/10/2022",
  },
  {
    id: "stock4",
    src: "/login_images/post_6f486030_img_03.jpg",
    caption: "Perfect morning",
    date: "04/05/2022",
  },
  {
    id: "stock5",
    src: "/login_images/post_6fc8c951_img_03.jpg",
    caption: "What it do?",
    date: "09/18/2022",
  },
  {
    id: "stock6",
    src: "/login_images/post_71f234d2_img_00.jpg",
    caption: "Lunch with friends",
    date: "05/30/2022",
  },
  {
    id: "stock7",
    src: "/login_images/post_78512145_img_00.jpg",
    caption: "Biscuits are in the basket.",
    date: "02/14/2022",
  },
  {
    id: "stock8",
    src: "/login_images/post_7e85815f_img_00.jpg",
    caption: "The purrfect coffee doesn't exist",
    date: "08/21/2022",
  },
  {
    id: "stock9",
    src: "/login_images/post_88b2fe64_img_00.jpg",
    caption: "Art gallery visit",
    date: "11/05/2022",
  },
  {
    id: "stock10",
    src: "/login_images/post_c096b3d9_img_06.jpg",
    caption: "Pupper power activate!",
    date: "10/12/2022",
  },
  {
    id: "stock11",
    src: "/login_images/post_ce1bf6e5_img_10.jpg",
    caption: "Fresh baked cookies?",
    date: "12/24/2022",
  },
  {
    id: "stock12",
    src: "/login_images/post_da12f6c5_img_00.jpg",
    caption: "chorped",
    date: "07/07/2022",
  },
  {
    id: "stock13",
    src: "/login_images/post_ec040e09_img_00.jpg",
    caption: "Cozy afternoon",
    date: "01/16/2022",
  },
];

// Predefined positions for stock images in a circular pattern
export const predefinedPositions = {
  // Calculate positions in a circle around the center (0,0)
  // Using a radius of 600 and distributing evenly
  stock1: { x: 600, y: 0 },                                  // 0 degrees
  stock2: { x: 553.5, y: 235.5 },                            // 23 degrees
  stock3: { x: 424, y: 424 },                                // 45 degrees
  stock4: { x: 235.5, y: 553.5 },                            // 68 degrees
  stock5: { x: 0, y: 600 },                                  // 90 degrees
  stock6: { x: -235.5, y: 553.5 },                           // 113 degrees
  stock7: { x: -424, y: 424 },                               // 135 degrees
  stock8: { x: -553.5, y: 235.5 },                           // 158 degrees
  stock9: { x: -600, y: 0 },                                 // 180 degrees
  stock10: { x: -553.5, y: -235.5 },                         // 203 degrees
  stock11: { x: -424, y: -424 },                             // 225 degrees
  stock12: { x: -235.5, y: -553.5 },                         // 248 degrees
  stock13: { x: 0, y: -600 },                                // 270 degrees
};
