// singaprinting/config/sgConfig.js

export const sgConfig = {
  site: {
    name: 'SingaPrinting',
    baseUrl: 'https://www.singaprinting.com/',
  },

  environment: {
    live: {
      baseUrl: 'https://www.singaprinting.com/',
      productSample: 'https://www.singaprinting.com/stickers/paper/art?featured=art-paper-roll', // sample product
    },
    dev: {
      baseUrl: 'https://dev.singaprinting.com/',
      domeStickers: 'https://dev.singaprinting.com/stickers/special/dome?featured=1', // sample product
    },
  },

  credentials: {
    email: 'trainee81.glophics@gmail.com',
    password: '1234516',
  },

  xpaths: {
    // 🔹 Header & Login
    loginIcon: '//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[2]/div/div/a',
    dropdownMenu: '//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[2]/div/div[2]',
    signInButton: '//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[2]/div/div[2]/ul/li[1]/button',
    loginModal: '//*[@id="#modal"]/div/div',
    emailField: '//*[@id="#modal"]/div/div/div[2]/div/form/div[1]/div/input',
    passwordField: '//*[@id="#modal"]/div/div/div[2]/div/form/div[2]/div/input',
    signInSubmit: '//*[@id="#modal"]/div/div/div[2]/div/form/div[4]/button',
    errorMessage: '//*[@id="#modal"]/div/div/div[2]/div/form/p',

    // 🔹 Future use (Product & Cart)
    productPage: '//*[@id="product_details"]',
    addToCartButton: '//*[@id="product_details"]/div[1]/aside/div[3]/div[2]/button[1]',
    cartIcon: '//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/a',
    checkoutButton: '//*[@id="cart"]/div/div/div[2]/a',
  },

  urls: {
    home: 'https://www.singaprinting.com/',
    productSample: 'https://www.singaprinting.com/stickers/paper/art?featured=art-paper-roll', // sample product
  },
};
