const { exec } = require('child_process');
const { unlinkSync } = require('fs');
const sharp = require('sharp');
const Jimp = require('jimp');
const log4js = require('log4js');

const ERROR_LOG = 'ERROR.log';
try {
  unlinkSync(ERROR_LOG);
} catch {}
log4js.configure({
  appenders: { XIAOMEI: { type: 'stdout' }, ERROR: { type: 'file', filename: ERROR_LOG } },
  categories: { default: { appenders: ['XIAOMEI'], level: 'info' }, ERROR: { appenders: ['ERROR'], level: 'error' } }
});
const logger = log4js.getLogger('XIAOMEI');
const errlogger = log4js.getLogger('ERROR');
const _error = logger.error;
logger.error = function (...args) {
  _error.call(this, ...args);
  errlogger.error(...args);
};

sharp.cache(false);

const adbPath = `./platform-tools/adb`;
const imgName = './autoxiaomei.png';
const iconX = 50;
const iconY = 675;
const iconLenX = 7;
const iconLenY = 9;
const iconWidth = 140;
const iconHeight = 140;

let noswipItems = [];
let sellItems = [];
let doubleClickItems = [];
let luckyLevelImg = '';
let demonX = 1;
let demonY = 2;

const COMPARE_X = 1;
const COMPARE_Y = 6;

const FACTORY_X = 1;
const FACTORY_Y = 4;

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const execAsync = (method, shell, show = false) => {
  return new Promise((resolve, reject) => {
    exec(shell, (err, stdout) => {
      if (err) {
        logger.error(method, err);
      }
      logger.info(method, show ? stdout : '');
      resolve(stdout);
    });
  });
};

const sameAsync = async (img1, img2, debug = false) => {
  const jImg1 = await Jimp.read(img1);
  const jImg2 = await Jimp.read(img2);
  const diff = Jimp.diff(jImg1, jImg2);

  let dist = 1;
  if (img2.pHash) {
    dist = jImg1.distanceFromHash(img2.pHash);
  } else {
    dist = Jimp.distance(jImg1, jImg2);
  }

  debug && console.log(dist, diff.percent);
  return dist < 0.15 && diff.percent < 0.15;
};

const exactSameAsync = async (img1, img2, debug = false) => {
  const jImg1 = await Jimp.read(img1);
  const jImg2 = await Jimp.read(img2);
  const diff = Jimp.diff(jImg1, jImg2, 0);

  return diff.percent < 0.1;
};

const devices = async () => {
  const method = 'devices';
  const shell = `${adbPath} devices`;
  const dev = await execAsync(method, shell);
  return dev.split(`\n`).length > 3;
};

const capture = async () => {
  let method = 'capture';
  let shell = `${adbPath} shell screencap -p /sdcard/${imgName}`;
  await execAsync(method, shell);

  method = 'copyimg';
  shell = `${adbPath} pull /sdcard/${imgName} .`;
  await execAsync(method, shell);
};

const click = async (x, y, times = 1) => {
  const method = 'click';
  const offset = Math.floor(Math.random() * 20);
  const shell = `${adbPath} shell input tap ${x + offset} ${y + offset}`;
  for (let i = 0; i < times; i++) {
    await execAsync(method, shell);
  }
};

const swipe = async (x1, y1, x2, y2) => {
  const method = 'swipe';
  const time = Math.floor(Math.random() * 1000) + 500;
  const shell = `${adbPath} shell input touchscreen swipe ${x1} ${y1} ${x2} ${y2} ${time}`;
  await execAsync(method, shell);
};

const getImgPos = (xi, yi) => {
  return {
    x: iconX + iconWidth * (xi - 1),
    y: iconY + iconHeight * (yi - 1)
  };
};

const getImgClickPos = (xi, yi) => {
  return {
    x: iconX + iconWidth * (xi - 1) + iconWidth / 2,
    y: iconY + iconHeight * (yi - 1) + iconHeight / 2
  };
};

const isLucky = async () => {
  logger.info('checking lucky');

  const x = 355;
  const y = 670;
  const width = 400;
  const height = 400;

  const clickX = 400;
  const clickY = 1500;

  const distImg = './imgLuck.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isLucky');
    click(clickX, clickY);
  }
  return same;
};

const isEmpty = async () => {
  logger.info('checking empty');

  const x = 275;
  const y = 725;
  const width = 350;
  const height = 300;

  const clickX = 950;
  const clickY = 670;

  const distImg = './imgEmpty.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isEmpty');
    click(clickX, clickY);
  }
  return same;
};

const isUpgrade = async () => {
  logger.info('checking upgrade');

  const x = 430;
  const y = 1400;
  const width = 200;
  const height = 90;

  const clickX = 540;
  const clickY = 1450;

  const distImg = './imgUpgrade.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isUpgrade');
    click(clickX, clickY);
  }
  return same;
};

const isLevelup = async () => {
  logger.info('checking levelup');

  const x = 250;
  const y = 1680;
  const width = 550;
  const height = 420;

  const clickX = 1005;
  const clickY = 1650;

  const distImg = './imgLevelup.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isLevelup');
    click(clickX, clickY);
  }
  return same;
};

const isAdvertise = async () => {
  logger.info('checking advertise');

  const x = 30;
  const y = 90;
  const width = 250;
  const height = 200;

  const clickX = 60;
  const clickY = 140;

  const distImg = './imgAdvertise.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isAdvertise');
    click(clickX, clickY);
  }
  return same;
};

const isError = async () => {
  logger.info('checking error');

  const x = 250;
  const y = 1020;
  const width = 600;
  const height = 340;

  const clickX = 535;
  const clickY = 1290;

  const distImg = './imgError.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isError');
    click(clickX, clickY);
  }
  return same;
};

const isGame = async () => {
  logger.info('checking game');

  const x = 20;
  const y = 80;
  const width = 950;
  const height = 125;

  const distImg = './imgGame.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('inTheGame');
  } else {
    logger.error('notInGame');
  }
  return same;
};

const isZero = async () => {
  logger.info('checking zero');

  const x = 520;
  const y = 245;
  const width = 50;
  const height = 30;

  const distImg = './imgZero.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isZero');
  }
  return same;
};

const orderLeftAction = async () => {
  const clickX = 360;
  const clickY = 500;
  await click(clickX, clickY);
};

const orderRightAction = async () => {
  const clickX = 780;
  const clickY = 500;
  await click(clickX, clickY);
};

const luckyAction = async () => {
  const x = 355;
  const y = 1155;
  const width = 25;
  const height = 35;

  const clickX = 400;
  const clickY = 1500;

  await capture();
  await sleep(500);

  if (!luckyLevelImg) {
    const distImg = './lv2-3.png';
    luckyLevelImg = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  }

  const img1 = luckyLevelImg;
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    const clickX = 540;
    const clickY = 1720;

    logger.info('lv2');
    await click(clickX, clickY);
    await sleep(1000);
    return;
  }

  logger.info('> lv2');
  await click(clickX, clickY);
};

const upgradeAction = async () => {
  const clickX = 540;
  const clickY = 1450;
  await click(clickX, clickY);
};

const sellAction = async (xi, yi) => {
  const x = 750;
  const y = 2020;
  const width = 70;
  const height = 40;

  const clickX = 780;
  const clickY = 2050;

  await click(getImgClickPos(xi, yi).x, getImgClickPos(xi, yi).y);
  await capture();
  await sleep(1000);

  const sell = async distImg => {
    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('sell');
      await click(clickX, clickY);
      await sleep(1000);

      await sellConfirmAction();
      return true;
    }
  };

  if (await sell('./imgSell1.png')) return;
  if (await sell('./imgSell2.png')) return;
  if (await sell('./imgSell4.png')) return;
};

const sellConfirmAction = async () => {
  const x = 170;
  const y = 1000;
  const width = 350;
  const height = 350;

  const clickX = 350;
  const clickY = 1290;

  await capture();
  await sleep(1000);

  const distImg = './imgSellEnd.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('sell confirm');
    await click(clickX, clickY);
  }
};

const doubleClick = async (xi, yi) => {
  logger.info('doubleClick');

  const { x, y } = getImgClickPos(xi, yi);

  await click(x, y);
  await sleep(100);
  await click(x, y);
};

const initItems = async () => {
  const width = iconWidth;
  const height = iconHeight;

  const genItem = async name => {
    const img = { width, height, name, data: await sharp(`./tools/${name}.png`).raw().toBuffer() };

    const jImg = await Jimp.read(img);
    const pHash = jImg.pHash();

    return { ...img, pHash };
  };

  if (!noswipItems.length) {
    // noswipItems = [await genItem('empty'), await genItem('libao1'), await genItem('baoxiang'), await genItem('jiandao')];
    noswipItems = [await genItem('empty')];
    sellItems = [await genItem('jiasu1'), await genItem('jiasu2'), await genItem('jiasu3'), await genItem('jialiang1'), await genItem('jialiang2')];
    doubleClickItems = [
      await genItem('jinbi2'),
      await genItem('jinbi3'),
      await genItem('tili1'),
      await genItem('tili2'),
      await genItem('tili3'),
      await genItem('tili4'),
      await genItem('tili5'),
      await genItem('tili6')
    ];

    const action = process.argv[2] ? process.argv[2] : '';
    if (action === 'kele') {
      noswipItems = [await genItem('kele7')];
      // sellItems.push(await genItem('kele1'));
    }
    if (action === 'che') {
      noswipItems.push(await genItem('che6'));
      // sellItems.push(await genItem('che1'));
    }
    if (action === 'guanmu') {
      noswipItems.push(await genItem('guanmu6'));
    }
    if (action === 'tiancai') {
      noswipItems.push(await genItem('tiancai5'));
      noswipItems.push(await genItem('tiancai6'));
      noswipItems.push(await genItem('tiancai7'));
    }
    if (action === 'luhui') {
      noswipItems.push(await genItem('luhui5'), await genItem('luhui6'), await genItem('luhui7'));
    }
    if (action === 'caomei') {
      noswipItems.push(await genItem('caomei5'), await genItem('caomei6'), await genItem('caomei7'));
    }
    if (action === 'jiucai') {
      // sellItems.push(await genItem('jiucai1'), await genItem('jiucai2'), await genItem('jiucai3'));
      noswipItems.push(await genItem('jiucai5'), await genItem('jiucai6'));
    }
    if (action === 'fendi') {
      // sellItems.push(await genItem('fendi1'));
      noswipItems.push(await genItem('fendi5'), await genItem('fendi6'));
    }
    if (action === 'jiezhi') {
      sellItems.push(await genItem('jiezhi1'), await genItem('shouzhuo1'));
      // noswipItems.push(await genItem('jiezhi6'), await genItem('shouzhuo5'));
    }
  }
};

const compare = async () => {
  logger.info('comparing');

  const startIndexX = COMPARE_X;
  const startIndexY = COMPARE_Y;

  const width = iconWidth;
  const height = iconHeight;

  const curItems = [];

  for (let y = startIndexY; y <= iconLenY; y++) {
    for (let x = startIndexX; x <= iconLenX; x++) {
      const { x: left, y: top } = getImgPos(x, y);
      const data = await sharp(imgName).extract({ left, top, width, height }).raw().toBuffer();
      const item = { x, y, width, height, data };
      let isItem = true;
      for (let i = 0; i < noswipItems.length; i++) {
        const same = await sameAsync(item, noswipItems[i]);
        if (same) {
          isItem = false;
        }
      }

      if (isItem) {
        for (let i = 0; i < sellItems.length; i++) {
          const same = await sameAsync(item, sellItems[i]);
          if (same) {
            isItem = false;
            logger.info('sellItems', x, y, sellItems[i].name);
            await sellAction(x, y);
          }
        }
      }

      if (isItem) {
        for (let i = 0; i < doubleClickItems.length; i++) {
          const same = await sameAsync(item, doubleClickItems[i]);
          if (same) {
            isItem = false;
            logger.info('doubleClickItems', x, y, doubleClickItems[i].name);
            await doubleClick(x, y);
          }
        }
      }

      if (isItem) {
        curItems.push(item);
      }
    }
  }

  const swipeItems = [];

  for (let i = 0; i < curItems.length - 1; i++) {
    const item1 = curItems[i];
    if (item1.used) continue;

    for (let j = i + 1; j < curItems.length; j++) {
      const item2 = curItems[j];
      const same = await sameAsync(item1, item2);
      if (same) {
        item2.used = true;
        swipeItems.push({ item1, item2 });
        break;
      }
    }
  }

  for (let i = 0; i < swipeItems.length; i++) {
    const { item1, item2 } = swipeItems[i];
    const from = getImgClickPos(item1.x, item1.y);
    const to = getImgClickPos(item2.x, item2.y);

    logger.info(`same [${item1.x},${item1.y}] - [${item2.x},${item2.y}]`);
    await swipe(from.x, from.y, to.x, to.y);
    await sleep(1000);
    await luckyAction();
    await sleep(100);
    await upgradeAction();
    await sleep(100);
  }

  logger.info('compare end');
};

const demon = async () => {
  if (demonX > iconLenX) {
    demonX = 0;
  } else {
    demonX++;
  }

  await doubleClick(demonX, demonY);
  await sleep(1000);
};

const getAllTools = async (x, y) => {
  await capture();
  await sleep(2000);

  const startIndexX = 1;
  const startIndexY = 5;

  const width = iconWidth;
  const height = iconHeight;

  for (let x = startIndexX; x <= iconLenX; x++) {
    for (let y = startIndexY; y <= iconLenY; y++) {
      const { x: left, y: top } = getImgPos(x, y);
      sharp(imgName).extract({ left, top, width, height }).toFile(`./tools/${x}${y}.png`);
    }
  }
};

const genTools = async (x, y) => {
  await capture();
  await sleep(2000);

  const { x: left, y: top } = getImgPos(x, y);
  const width = iconWidth;
  const height = iconHeight;
  const name = process.argv[3] ? process.argv[3] : 'temp';

  sharp(imgName).extract({ left, top, width, height }).toFile(`./tools/${name}.png`);
};

const debugCheck = async () => {
  const width = 140;
  const height = 140;

  const distImg = await sharp('./tools/empty.png').raw().toBuffer();

  const imgs = [await sharp('./tools/guozhi1.png').raw().toBuffer(), await sharp('./tools/guozhi2.png').raw().toBuffer()];

  for (let i = 0; i < imgs.length; i++) {
    const same = await sameAsync({ width, height, data: imgs[i] }, { width, height, data: distImg }, true);
    console.log(same);
  }

  const jImg1 = await Jimp.read('./tools/guozhi1.png');
  const jImg2 = await Jimp.read('./tools/empty.png');
  const dist = Jimp.distance(jImg1, jImg2);
  const diff = Jimp.diff(jImg1, jImg2);
  console.log({ dist, diff });
};

const debugCheck2 = async () => {
  const width = 400;
  const height = 400;

  const distImg = await sharp('./temp2.png').raw().toBuffer();

  const imgs = [await sharp('./temp1.png').raw().toBuffer()];

  console.log(distImg, imgs);

  for (let i = 0; i < imgs.length; i++) {
    const same = await sameAsync({ width, height, data: imgs[i] }, { width, height, data: distImg }, true);
    console.log(same);
  }
};

const debugCompare = async () => {
  const startIndexX = 1;
  const startIndexY = 4;

  const width = iconWidth;
  const height = iconHeight;

  const curItems = [];

  for (let x = startIndexX; x <= iconLenX; x++) {
    for (let y = startIndexY; y <= iconLenY; y++) {
      const { x: left, y: top } = getImgPos(x, y);
      const data = await sharp('./debug.png').extract({ left, top, width, height }).raw().toBuffer();
      // const data = await sharp(`./tools/${x}${y}.png`).raw().toBuffer();
      sharp('./debug.png').extract({ left, top, width, height }).toFile(`./tools/${x}${y}.png`);
      const item = { x, y, width, height, data };
      let isItem = true;

      for (let i = 0; i < noswipItems.length; i++) {
        const same = await sameAsync(item, noswipItems[i]);
        if (same) {
          logger.info('noswipItems', x, y, noswipItems[i].name);
          isItem = false;
        }
      }
      for (let i = 0; i < sellItems.length; i++) {
        const same = await sameAsync(item, sellItems[i]);
        if (same) {
          logger.info('sellItems', x, y, sellItems[i].name);
          isItem = false;
        }
      }
      for (let i = 0; i < doubleClickItems.length; i++) {
        const same = await sameAsync(item, doubleClickItems[i]);
        if (same) {
          logger.info('doubleClickItems', x, y, doubleClickItems[i].name);
          isItem = false;
        }
      }

      if (isItem) {
        curItems.push(item);
      }
    }
  }

  // curItems.forEach(_ => console.log(_.x, _.y));

  for (let i = 0; i < curItems.length - 1; i++) {
    const item1 = curItems[i];
    for (let j = i + 1; j < curItems.length; j++) {
      const item2 = curItems[j];
      const same = await sameAsync(item1, item2);
      if (same) {
        logger.info(`same [${item1.x},${item1.y}] - [${item2.x},${item2.y}]`);
      }
    }
  }
};

let factoryFlag = true;

const main = async () => {
  const linked = await devices();
  if (!linked) {
    logger.error('NO DEVICES');

    setTimeout(() => {
      main();
    }, 60 * 1000);
    return;
  }

  const factoryX = FACTORY_X;
  const factoryY = FACTORY_Y;
  let refresh = false;

  await initItems();

  await capture();
  await sleep(1000);

  if (await isEmpty()) {
    factoryFlag = false;
    refresh = true;

    setTimeout(() => {
      factoryFlag = true;
    }, 5 * 60 * 1000);

    await sleep(1000);
  }

  if (!refresh && (await isError())) {
    setTimeout(() => {
      main();
    }, 10 * 60 * 1000);
  }

  if (!refresh && (await isAdvertise())) {
    refresh = true;
    await sleep(2000);
  }

  if (!refresh && (await isLucky())) {
    refresh = true;
    await sleep(1000);
  }

  if (!refresh && (await isUpgrade())) {
    refresh = true;
    await sleep(1000);
  }

  if (!refresh && (await isLevelup())) {
    refresh = true;
    await sleep(1000);
  }

  if (refresh) {
    await capture();
    await sleep(1000);
  }

  if (await isGame()) {
    await demon();
    await compare();

    if (factoryFlag && !(await isZero())) {
      await doubleClick(factoryX, factoryY);
      // await sleep(1000);
      // await orderLeftAction();
      // await sleep(1000);
      // await orderRightAction();
    }
  }

  const speed = process.argv[3] ? Number(process.argv[3]) : 10;
  setTimeout(() => {
    main();
  }, speed * 1000);
};

const action = process.argv[2] ? process.argv[2] : '';
switch (action) {
  case '':
  case 'kele':
  case 'che':
  case 'guanmu':
  case 'tiancai':
  case 'luhui':
  case 'caomei':
  case 'jiucai':
  case 'fendi':
  case 'jiezhi':
    logger.info(`aciotn ${action}`);
    main();
    break;
  case 'cap':
    capture();
    break;
  case 'tool':
    genTools(2, 7);
    break;
  case 'all':
    getAllTools();
    break;
  case 'debug':
    debugCheck();
    break;
  default:
    main();
    break;
}

// node . tool jiucai3

// debugCompare();
