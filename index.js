const { exec } = require('child_process');
const { unlinkSync, existsSync, mkdirSync } = require('fs');
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
let storeItems = [];
const demon1 = { x: 1, y: 1, xLen: 2 };
const demon2 = { x: 1, y: 2, xLen: iconLenX - 4 };
const demon3 = { x: 1, y: 3, xLen: iconLenX - 3 };

const COMPARE_X = 1;
const COMPARE_Y = 5;

const FACTORY_X = 1;
const FACTORY_Y = 4;

const DEBUG_LV1 = false;
const DEBUG_LV2 = false;

let ONLY_STORE = false;

const sleep = (ms = 1000) => {
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
  return dist < 0.15 && diff.percent < 0.1;
};

const exactSameAsync = async (img1, img2, debug = false) => {
  const jImg1 = await Jimp.read(img1);
  const jImg2 = await Jimp.read(img2);
  const diff = Jimp.diff(jImg1, jImg2, 0);

  debug && console.log(dist, diff.percent);
  return diff.percent < 0.1;
};

const devices = async () => {
  const method = 'devices';
  const shell = `${adbPath} devices`;
  const dev = await execAsync(method, shell);
  return dev.split(`\n`).length > 3;
};

const apps = async () => {
  const method = 'apps';
  const shell = `${adbPath} shell dumpsys activity top`;
  const all = await execAsync(method, shell);
  const pks = all.split(`\n`).filter(_ => _.includes('Package:'));
  console.log(pks);
};

const kill = async () => {
  const method = 'kill';
  const shell = `${adbPath} shell am force-stop com.taobao.taobao`;
  await execAsync(method, shell);
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
  const shell = `${adbPath} shell input tap ${Math.floor(x) + offset} ${Math.floor(y) + offset}`;
  for (let i = 0; i < times; i++) {
    await execAsync(method, shell);
  }
};

const swipe = async (x1, y1, x2, y2, speed = 1000) => {
  const method = 'swipe';
  const time = Math.floor(Math.random() * speed) + 500;
  const shell = `${adbPath} shell input touchscreen swipe ${Math.floor(x1)} ${Math.floor(y1)} ${Math.floor(x2)} ${Math.floor(y2)} ${time}`;
  await execAsync(method, shell);
};

const home = async () => {
  const method = 'home';
  const shell = `${adbPath} shell input keyevent KEYCODE_HOME`;
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

// todo
const isAuction = async () => {
  logger.info('checking auction');

  const x = 400;
  const y = 1980;
  const width = 200;
  const height = 70;

  const clickX = 1000;
  const clickY = 1660;

  const distImg = './imgAuction.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isAuction');
    click(clickX, clickY);
  }
  return same;
};

// todo
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

const isEnergyAd = async () => {
  logger.info('checking energy ad');

  const x = 420;
  const y = 1515;
  const width = 200;
  const height = 80;

  const clickX1 = 380;
  const clickY1 = 1750;

  const clickX2 = 540;
  const clickY2 = 1890;

  const distImg = './imgEnergyAd2.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isEnergyAd');
    click(clickX1, clickY1);
    await sleep();
    click(clickX2, clickY2);
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

// todo
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

// todo
const isAd1 = async () => {
  logger.info('checking ad1');

  const x = 510;
  const y = 1940;
  const width = 60;
  const height = 60;

  const clickX = 540;
  const clickY = 1970;

  const distImg = './imgAd1.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isAd1');
    click(clickX, clickY);
  }
  return same;
};

// todo
const isDemon = async () => {
  logger.info('checking demon');

  const x = 350;
  const y = 630;
  const width = 75;
  const height = 75;

  const clickX = 550;
  const clickY = 1340;

  const distImg = './imgDemon.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isDemon');
    click(clickX, clickY);
  }
  return same;
};

// todo
const isFriend = async () => {
  logger.info('checking friend');

  const x = 380;
  const y = 1470;
  const width = 70;
  const height = 75;

  const clickX = 550;
  const clickY = 1510;

  const distImg = './imgFriend.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isFriend');
    click(clickX, clickY);
  }
  return same;
};

// todo
const isAchievement = async () => {
  logger.info('checking achievement');

  const x = 400;
  const y = 1288;
  const width = 300;
  const height = 75;

  const clickX = 540;
  const clickY = 1560;

  const distImg = './imgAchievement.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isAchievement');
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
    sharp(imgName).toFile(`./debug/notInGame-${Date.now()}.png`);
  }
  return same;
};

// start store
const openStore = async () => {
  logger.info('open store');

  const clickX = 980;
  const clickY = 2050;

  await click(clickX, clickY);
};

const closeStore = async () => {
  logger.info('close store');

  const clickX = 100;
  const clickY = 530;

  await click(clickX, clickY);
};

const isStore = async () => {
  logger.info('checking store');

  const x = 410;
  const y = 490;
  const width = 100;
  const height = 80;

  const distImg = './store/imgStore.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isStore');
  }
  return same;
};

const isStoreDown = async () => {
  logger.info('checking store down');

  const x = 390;
  const y = 750;
  const width = 300;
  const height = 80;

  const distImg = './store/imgDown.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isStoreDown');
  }
  return same;
};

const isStoreUp = async () => {
  logger.info('checking store up');

  const x = 410;
  const y = 430;
  const width = 360;
  const height = 80;

  const distImg = './store/imgUp.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isStoreUp');
  }
  return same;
};

const upStoreItem = async () => {
  logger.info('upStoreItem');

  const itemStartX = 200;
  const itemStartY = 575;
  const itemSpaceX = 197;
  const itemSpaceY = 280;
  const itemXLen = 4;
  const itemYLen = 3;
  const width = 100;
  const height = 120;

  for (let i = 0; i < itemXLen; i++) {
    const x = itemStartX + i * itemSpaceX;
    for (let j = 0; j < itemYLen; j++) {
      const y = itemStartY + j * itemSpaceY;

      const data = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();
      const item = { width, height, data };
      for (let s = 0; s < storeItems.length; s++) {
        const distItem = {
          width,
          height,
          data: await sharp(`./store/items/${storeItems[s].name}-0.png`).extract({ left: x, top: y, width, height }).raw().toBuffer()
        };
        if (await sameAsync(item, distItem)) {
          await click(x + width / 2, y + height / 2);
          return { same: true, ...storeItems[s] };
        }

        distItem.data = await sharp(`./store/items/${storeItems[s].name}-1.png`).extract({ left: x, top: y, width, height }).raw().toBuffer();
        if (await sameAsync(item, distItem)) {
          await click(x + width / 2, y + height / 2);
          return { same: true, ...storeItems[s] };
        }
      }
    }
  }
  return { same: false };
};

const isUpStoreTip = async () => {
  logger.info('check upStore Tip');

  const x = 400;
  const y = 1255;
  const width = 250;
  const height = 80;

  const clickX = 500;
  const clickY = 1300;

  await capture();

  const distImg = './store/imgTip.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('isUpStoreTip');
    await click(clickX, clickY);
  }
  return same;
};

const upStore = async () => {
  logger.info('up store');

  const itemX = 190;
  const itemY = 785;
  const width = 350;
  const height = 395;

  const itemLen = 3;

  const itemDownX = 540;
  const itemDownY = 1880;

  const itemBoardX = [250, 250];
  const itemBoardY = [1190, 100];
  const itemPriceX = [540, 100, 950];
  const itemPriceY = [1525, 1525];
  const itemUpX = 540;
  const itemUpY = 1660;

  if (!storeItems.length) return;

  await openStore();
  await sleep();
  await capture();
  if (!(await isStore())) {
    return;
  }

  let noUp = false;
  for (let i = 0; i < itemLen; i++) {
    const x = itemX + i * width;

    for (let j = 0; j < itemLen; j++) {
      const y = itemY + j * height;

      await sleep();
      await click(x, y);
      await sleep();
      await capture();

      if (await isStoreUp()) {
        if (noUp) {
          await click(itemDownX, itemDownY);
        } else {
          await swipe(itemBoardX[0], itemBoardY[0], itemBoardX[1], itemBoardY[1]);
          await sleep();
          await capture();
          const findItem = await upStoreItem();
          if (findItem.same) {
            if (!findItem.pass) {
              await sleep();
              await swipe(itemPriceX[0], itemPriceY[0], itemPriceX[findItem.max ? 2 : 1], itemPriceY[1]);
            }
            await sleep();
            await click(itemUpX, itemUpY);
            await sleep();

            await isUpStoreTip();
          } else {
            await click(itemDownX, itemDownY);
            noUp = true;
          }
        }
      } else {
        await click(itemDownX, itemDownY);
      }
    }
  }

  await closeStore();

  await sleep();
  await capture();
};
// end store

const downItem = async () => {
  logger.info('up store');

  const itemX = 520;
  const itemY = 1320;

  const item1X = 254;
  const item1Y = 630;
  const itemPriceX = [540, 950];
  const itemPriceY = [1525, 1525];
  const itemUpX = 540;
  const itemUpY = 1660;

  await sleep();
  await capture();

  await click(itemX, itemY);

  if (await isStoreDown()) {
    await click(itemX, itemY);
  } else {
    if (await isStoreUp()) {
      await click(item1X, item1Y);

      await sleep();
      await swipe(itemPriceX[0], itemPriceY[0], itemPriceX[1], itemPriceY[1]);
      await sleep();
      await click(itemUpX, itemUpY);
      await sleep();

      await isUpStoreTip();
    }
  }

  setTimeout(async () => {
    await downItem();
  }, 1000);
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

// todo
const luckyAdAction = async () => {
  const x = 410;
  const y = 1465;
  const width = 259;
  const height = 70;

  const distImg = './lv-ad1.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  return same;
};

const luckyAction = async () => {
  const x = 355;
  const y = 1155;
  const width = 25;
  const height = 35;

  const clickX = 400;
  const clickY = 1500;

  const closeX = 540;
  const closeY = 1720;

  await capture();
  await sleep(500);

  const isLucky = async (distImg, info) => {
    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info(info);
      await click(closeX, closeY);
      await sleep();
    } else {
      logger.info('not', info);
    }

    return same;
  };

  if (await isLucky('./lv2-3.png', 'lv2')) return;
  if (await isLucky('./lv3-4.png', 'lv3')) return;

  if (await luckyAdAction()) {
    logger.info('lv ad');
    await click(closeX, closeY);
    return;
  }

  logger.info('lucky');
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
  await sleep();

  const sell = async distImg => {
    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('sell');
      await click(clickX, clickY);
      await sleep();

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
  await sleep();

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

const restartGame = async () => {
  const x = 550;
  const y = 1500;
  const width = 180;
  const height = 180;

  const clickX = 670;
  const clickY = 1650;

  await capture();
  await sleep(500);

  const distImg = './imgHome.png';

  const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
  const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: img1 }, { width, height, data: img2 });

  if (same) {
    logger.info('restartGame');
    click(clickX, clickY);
  }
  return same;
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
    noswipItems = [await genItem('empty'), await genItem('jiandao')];
    sellItems = [await genItem('jiasu1'), await genItem('jiasu2'), await genItem('jiasu3'), await genItem('jialiang1'), await genItem('jialiang2')];
    doubleClickItems = [
      await genItem('jinbi2'),
      await genItem('jinbi3'),
      await genItem('jinbi5'),
      await genItem('jinbi6'),
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
    if (action === 'baicau') {
      noswipItems.push(await genItem('baicau9'));
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
      // noswipItems.push(await genItem('jiezhi6'));
    }
    if (action === 'mianhua') {
      // sellItems.push(await genItem('mianhua1'));
      noswipItems.push(await genItem('mianhua5'), await genItem('meibi5'));
    }
    if (action === 'shuijiao') {
      // sellItems.push(await genItem('fengzheng1'));
      storeItems.push({ name: 'tuzi5', max: true });
      storeItems.push({ name: 'xiari5', max: true });
      // storeItems.push({ name: 'xing5', pass: true });
      // storeItems.push({ name: 'xing5' });
      noswipItems.push(await genItem('tuzi5'));
      // noswipItems.push(await genItem('xiari5'));
    }
    if (action === 'onlystore') {
      storeItems.push({ name: 'tuzi5', max: true });
      storeItems.push({ name: 'xiari5', max: true });
      // storeItems.push({ name: 'xing5', pass: true });
      // storeItems.push({ name: 'xing5' });
      ONLY_STORE = true;
    }
    if (action === 'nostore') {
      noswipItems.push(await genItem('tuzi5'));
    }
  }

  const debugDir = existsSync('./debug');
  if (!debugDir) {
    mkdirSync('./debug');
  }
};

const cleanStar = async () => {
  const { x, y } = getImgClickPos(1, 4);
  await swipe(x, y, x + 40, y + 40, 2000);
  await sleep();
  await capture();
};

const compare = async () => {
  logger.info('comparing');

  const startIndexX = COMPARE_X;
  const startIndexY = COMPARE_Y;

  const width = iconWidth;
  const height = iconHeight;

  const curItems = [];

  const now = Date.now();

  const compareImg = './imgCompare.png';

  await cleanStar();
  await sharp(imgName).toFile(compareImg);

  for (let y = startIndexY; y <= iconLenY; y++) {
    for (let x = startIndexX; x <= iconLenX; x++) {
      const { x: left, y: top } = getImgPos(x, y);
      const data = await sharp(compareImg).extract({ left, top, width, height }).raw().toBuffer();
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
        if (DEBUG_LV1) {
          sharp(compareImg).extract({ left, top, width, height }).toFile(`./debug/${now}-${x}-${y}.png`);
        }
        curItems.push(item);
      }
    }
  }

  if (DEBUG_LV2) {
    sharp(compareImg).toFile(`./debug/${now}.png`);
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
    await sleep();
    await luckyAction();
    await sleep(100);
    await upgradeAction();
    await sleep(100);
  }

  logger.info('compare end');
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

const genStore = async () => {
  await capture();
  await sleep(2000);

  const name = process.argv[3] ? process.argv[3] : 'temp';
  const index = process.argv[4] ? process.argv[4] : '0';

  sharp(imgName).toFile(`./store/items/${name}-${index}.png`);
};

const debugCheck = async (x1, y1, x2, y2) => {
  await capture();
  await sleep();

  const { x: left1, y: top1 } = getImgPos(x1, y1);
  const { x: left2, y: top2 } = getImgPos(x2, y2);
  const width = iconWidth;
  const height = iconHeight;

  const jImg1 = await sharp(imgName).extract({ left: left1, top: top1, width, height }).raw().toBuffer();
  const jImg2 = await sharp(imgName).extract({ left: left2, top: top2, width, height }).raw().toBuffer();

  const same = await sameAsync({ width, height, data: jImg1 }, { width, height, data: jImg2 }, true);
  console.log(same);
};

const debugCheck2 = async (x, y, name) => {
  await capture();
  await sleep();

  const { x: left, y: top } = getImgPos(x, y);
  const width = iconWidth;
  const height = iconHeight;

  const jImg1 = await sharp(imgName).extract({ left, top, width, height }).raw().toBuffer();
  const jImg2 = await sharp(`./tools/${name}.png`).raw().toBuffer();

  await sharp(imgName).extract({ left, top, width, height }).toFile(`./tools/temp.png`);

  const same = await sameAsync({ width, height, data: jImg1 }, { width, height, data: jImg2 }, true);
  console.log(same);
};

const debugCheck3 = async () => {
  const width = iconWidth;
  const height = iconHeight;

  const jImg1 = await sharp(`./tools/test1.png`).raw().toBuffer();
  const jImg2 = await sharp(`./tools/test2.png`).raw().toBuffer();
  const jImg3 = await sharp(`./tools/xiari5.png`).raw().toBuffer();

  const same1 = await sameAsync({ width, height, data: jImg1 }, { width, height, data: jImg2 }, true);
  console.log('1-2', same1);
  const same2 = await sameAsync({ width, height, data: jImg2 }, { width, height, data: jImg3 }, true);
  console.log('2-3', same2);
  const same3 = await sameAsync({ width, height, data: jImg1 }, { width, height, data: jImg3 }, true);
  console.log('1-3', same3);
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

const debugStore = async () => {
  const itemStartX = 200;
  const itemStartY = 575;
  const itemSpaceX = 197;
  const itemSpaceY = 280;
  const itemWidth = 100;
  const itemHeight = 120;
  const itemXLen = 4;
  const itemYLen = 3;

  storeItems = { name: 'tuzi5', max: true };
  for (let i = 0; i < itemXLen; i++) {
    const width = itemWidth;
    const height = itemHeight;
    const x = itemStartX + i * itemSpaceX;
    for (let j = 0; j < itemYLen; j++) {
      const y = itemStartY + j * itemSpaceY;

      await sharp(imgName).extract({ left: x, top: y, width, height }).toFile(`./store/items/temp/${i}-${j}.png`);

      for (let s = 0; s < storeItems.length; s++) {
        const path0 = `./store/items/${storeItems[s].name}-0.png`;
        await sharp(path0).extract({ left: x, top: y, width, height }).toFile(`./store/items/temp/d0-${i}-${j}.png`);
        const path1 = `./store/items/${storeItems[s].name}-1.png`;
        await sharp(path1).extract({ left: x, top: y, width, height }).toFile(`./store/items/temp/d1-${i}-${j}.png`);
      }
    }
  }

  console.log(await sameAsync('./store/items/temp/2-0.png', './store/items/temp/1-1.png'));
  console.log(await sameAsync('./store/items/temp/1-1.png', './store/items/temp/2-1.png'));
};

let factoryFlag = true;
let reInit = false;

// todo
const teamAd = async () => {
  logger.info('team ad');

  const isTeam1 = async () => {
    logger.info('check team1');

    const x = 830;
    const y = 1804;
    const width = 125;
    const height = 50;

    const clickX = 900;
    const clickY = 1830;

    await capture();
    await sleep(500);

    const distImg = './imgTeam1.png';

    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('team1');
      await click(clickX, clickY);
    }

    return same;
  };

  const isTeam2 = async () => {
    logger.info('check team2');

    const x = 0;
    const y = 128;
    const width = 80;
    const height = 200;

    const clickX = 40;
    const clickY = 160;

    await capture();
    await sleep(500);

    const distImg = './imgTeam2.png';

    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('team2');
      await click(clickX, clickY);
    }

    return same;
  };

  const isTeam3 = async () => {
    logger.info('check team3');

    const x = 480;
    const y = 2055;
    const width = 200;
    const height = 70;

    const clickX = 80;
    const clickY = 150;

    await capture();
    await sleep(500);

    const distImg = './imgTeam3.png';

    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('team3');
      await click(clickX, clickY);
    }

    return same;
  };

  const isTeam4 = async () => {
    logger.info('check team4');

    const x = 830;
    const y = 1804;
    const width = 125;
    const height = 50;

    const clickX = 900;
    const clickY = 1830;

    await capture();
    await sleep(500);

    const distImg = './imgTeam4.png';

    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('team4');
      await click(clickX, clickY);
    }

    return same;
  };

  const isTeam5 = async () => {
    logger.info('check team5');

    const x = 830;
    const y = 1804;
    const width = 125;
    const height = 50;

    const clickX = 900;
    const clickY = 1830;

    await capture();
    await sleep(500);

    const distImg = './imgTeam5.png';

    const img1 = await sharp(distImg).extract({ left: x, top: y, width, height }).raw().toBuffer();
    const img2 = await sharp(imgName).extract({ left: x, top: y, width, height }).raw().toBuffer();

    const same = await exactSameAsync({ width, height, data: img1 }, { width, height, data: img2 });

    if (same) {
      logger.info('team5');
      await click(clickX, clickY);
    }

    return same;
  };

  if (await isTeam1()) {
    setTimeout(() => {
      teamAd();
    }, 30000);
    return;
  }

  if (await isTeam2()) {
    setTimeout(() => {
      teamAd();
    }, 10000);
    return;
  }

  if (await isTeam3()) {
    setTimeout(() => {
      teamAd();
    }, 10000);
    return;
  }

  await isTeam4();

  await isTeam5();

  setTimeout(() => {
    teamAd();
  }, 1000);
};

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
  await sleep();

  if (await isEmpty()) {
    factoryFlag = false;
    refresh = true;

    setTimeout(() => {
      factoryFlag = true;
    }, 5 * 60 * 1000);

    await sleep();
  }

  if (!refresh && (await isAd1())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isAuction())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isUpgrade())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isLevelup())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isDemon())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isFriend())) {
    refresh = true;
    await sleep();
    await capture();
    await sleep();
    await isUpgrade();
    await sleep();
  }

  if (!refresh && (await isAchievement())) {
    refresh = true;
    await sleep();
  }

  if (!refresh && (await isStore())) {
    refresh = true;
    await closeStore();
    await sleep();
  }

  if (refresh) {
    await capture();
    await sleep();
  }

  if (await isGame()) {
    await upStore();
    if (ONLY_STORE) {
      setTimeout(() => {
        main();
      }, 10 * 1000);
      return;
    }

    for (let i = demon1.x; i <= demon1.xLen; i++) {
      // await doubleClick(i, demon1.y);
    }
    for (let i = demon2.x; i <= demon2.xLen; i++) {
      // await doubleClick(i, demon2.y);
    }
    for (let i = demon3.x; i <= demon3.xLen; i++) {
      await doubleClick(i, demon3.y);
    }

    // await doubleClick(4, 2);
    // await doubleClick(5, 2);
    // await doubleClick(6, 2);

    await sleep(5000);

    if (factoryFlag) {
      for (let i = 0; i < 10; i++) {
        await doubleClick(factoryX, factoryY);
      }
      for (let i = 0; i < 10; i++) {
        // await doubleClick(factoryX + 1, factoryY);
      }
      for (let i = 0; i < 10; i++) {
        // await doubleClick(factoryX + 2, factoryY);
      }
      for (let i = 0; i < 3; i++) {
        // await doubleClick(factoryX, factoryY);
      }

      const clickTime = new Date('2023-07-06T04:00:00.000').getTime();
      if (Date.now() > clickTime) {
        // await doubleClick(factoryX, factoryY);

        if (!reInit) {
          // reInit = true;
          // sellItems.pop();
        }
        for (let i = 0; i < 10; i++) {
          // await doubleClick(factoryX, factoryY);
          // await doubleClick(factoryX + 1, factoryY);
          // await doubleClick(factoryX + 2, factoryY);
        }
      }

      // await sleep();
      // await orderLeftAction();
      // await sleep();
      // await orderRightAction();
    }

    await sleep();
    await capture();
    await sleep();
    if (await isEmpty()) {
      await sleep();
      await capture();
      await sleep();
    }
    if (await isEnergyAd()) {
      await sleep();
      await capture();
      await sleep();
    }
    if (await isGame()) {
      await compare();
    }
  } else {
    await kill();
    await sleep();
    await restartGame();
    await sleep(60 * 1000);
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
  case 'baicai':
  case 'luhui':
  case 'caomei':
  case 'jiucai':
  case 'fendi':
  case 'jiezhi':
  case 'mianhua':
  case 'shuijiao':
  case 'onlystore':
  case 'nostore':
    logger.info(`action ${action}`);
    main();
    break;
  case 'team':
    teamAd();
    break;
  case 'down':
    downItem();
    break;
  case 'cap':
    capture().then(() => {
      const img = process.argv[3];
      if (img) {
        sharp(imgName).toFile(`./${img}.png`);
      }
    });
    break;
  case 'tool':
    genTools(2, 9);
    break;
  case 'store':
    genStore();
    break;
  case 'all':
    getAllTools();
    break;
  case 'debug':
    debugCheck(1, 6, 1, 7);
    debugCheck(1, 6, 1, 9);
    break;
  case 'debug2':
    debugCheck2(6, 8, 'jiasu2');
    break;
  case 'debug3':
    debugCheck3();
    break;
  case 'lucky':
    luckyAction();
    break;
  case 'debugStore':
    debugStore();
    break;
  default:
    main();
    break;
}

/**
 *
 *
node . tool jiucai3
node . store jiucai3 0

debugCompare();
 *
 */
