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
      buttonBadges: 'https://dev-new-product.singaprinting.com/badges/button-badge?featured=1', // sample product
    },
  },

  credentials: {
    email: 'trainee108.glophics@gmail.com',
    password: '123456789',
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

    uploadModalXPath: 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div',
    artworkInputXPath: 'xpath=//*[@id="artwork_input_file"]',
    specialInstructionXPath: 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[1]/textarea',
    continueButtonXPath: 'xpath=//*[@id="__layout"]/div/div[1]/header/div[3]/div/div[2]/div[2]/div/button',
    cartCloseXPath: 'xpath=//*[@id="__layout"]/div/div[1]/header/div[1]/div/div/div[2]/ul/li[3]/div/a',
  },

  urls: {
    home: 'https://www.singaprinting.com/',
    productSample: 'https://www.singaprinting.com/stickers/paper/art?featured=art-paper-roll', // sample product
  },
};
