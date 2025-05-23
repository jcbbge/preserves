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

// Import default positions from configuration
import { DEFAULT_POSITIONS } from "~/config/defaultPositions";

// Use configured default positions for stock images
// These create a circular scattering around the login component at world origin (0,0)
export const predefinedPositions = DEFAULT_POSITIONS.stockPhotos;
