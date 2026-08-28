/* Languages. One flat dictionary per language, English first — every other
   pack falls back to it key by key, so a half-finished translation shows
   English words rather than raw keys.

   Two kinds of string live here:
   - UI text, reached with MSM.t('key', {params}) and {braces} for values;
   - the NAMES in config.js (stores, products, the bed a product comes from,
     the floor sections). Those are not fetched at every call site. Instead
     localizeConfig() writes the translation straight into MSM.CFG, keeping
     the English original in a __en field, so the rest of the game keeps
     reading prod.name and never learns that languages exist.

   This file is UTF-8 and index.html loads it with charset="utf-8". */
window.MSM = window.MSM || {};

(function () {
  const KEY = 'msm.lang';

  /* --------------------------------------------------------------- en */
  const EN = {
    'dock.products': 'Products', 'dock.staff': 'Staff',
    'dock.map': 'Map', 'dock.boost': 'Boost',
    'title.staff': 'Staff', 'title.map': 'Map', 'title.boost': 'Boost',
    'title.settings': 'Settings', 'title.offline': 'Welcome back!',

    'buy.1': '×1', 'buy.10': '×10', 'buy.max': 'Max',
    'prod.build': 'Stand on its plot to build — {cost}',
    'prod.later': 'Unlocks later',
    'lv': 'Lv {n}',
    'prod.price': '{price} · every {sec}s',
    'meter.shelf': 'Shelf', 'meter.crate': 'Crate',
    'prod.next': ' · next bonus Lv {n}',
    'prod.maxed': ' · maxed',
    'btn.upgrade': 'Upgrade ×{n}',

    'staff.hint': 'Staff for {store}. Hire both and it earns while you are elsewhere.',
    'staff.stockers': 'Stockers {a}/{b}',
    'staff.stockersOn': '{n} on the floor — hire more to keep every section filled',
    'staff.stockersOff': 'Runs station → shelf so you do not have to',
    'staff.cashier': 'Cashier',
    'staff.cashierOn': 'Serving the queue without you',
    'staff.cashierOff': 'Otherwise you must stand at the till',
    'staff.rate': 'This store, unattended',
    'btn.hired': 'Hired ✓', 'btn.hire': 'Hire',

    'map.hint': 'Unlock a store once, then travel between them any time.',
    'map.products': '{n} products',
    'map.here': '• here',
    'map.earning': 'earning {n}/s unattended',
    'map.needs': 'needs a stocker and a cashier to idle',
    'btn.unlock': 'Unlock', 'btn.youAreHere': 'You are here', 'btn.travel': 'Travel',

    'boost.hint': 'Gems come from mall levels — {n} per level.',
    'boost.name': 'Rush Hour ×{n}',
    'boost.active': 'Active for {n}s',
    'boost.sub': 'Doubles every sale price for {n}s',
    'btn.active': 'Active', 'btn.activate': 'Activate',

    'set.earned': 'Total earned',
    'set.earnedSub': '{n} · {c} customers served',
    'set.controls': 'Controls',
    'set.controlsSub': 'Drag anywhere to walk · WASD on desktop · scroll to zoom',
    'set.save': 'Save',
    'set.saveSub': 'Autosaves every 10s and when you leave',
    'set.lang': 'Language',
    'set.langSub': 'Menus, labels and tips',
    'set.reset': 'Reset progress',
    'set.resetSub': 'Start over from the grocery store',
    'btn.saveNow': 'Save now', 'btn.reset': 'Reset',

    'bk.file': 'Backup file',
    'bk.fileSub': 'One .json you can keep anywhere',
    'bk.restore': 'Restore from file',
    'bk.replaces': "Replaces this browser's progress",
    'btn.export': 'Export', 'btn.import': 'Import',
    'drive.name': 'Google Drive',
    'drive.unset': 'Not set up — see docs/DRIVE.md',
    'drive.restore': 'Restore from Drive',
    'drive.auto': 'Auto-backup',
    'drive.autoSub': 'Pushes after a save, at most once a minute',
    'drive.last': 'Last copy {when}',
    'drive.none': 'No copy in Drive yet',
    'drive.needSignIn': 'Auto-backup needs you to sign in — tap "To Drive" once',
    'btn.toDrive': 'To Drive', 'btn.fromDrive': 'From Drive',
    'btn.on': 'On', 'btn.off': 'Off',

    'off.title': 'Your staff kept working',
    'off.sub': '{t} away · paid at {p}% rate',
    'btn.collect': 'Collect',

    'toast.saved': 'Saved',
    'toast.reset': 'Progress reset',
    'confirm.reset': 'Reset all progress? This cannot be undone.',
    'confirm.import': 'Replace your current progress with this save? This cannot be undone.',
    'confirm.drive': 'Replace your current progress with the Drive save? This cannot be undone.',
    'toast.exported': 'Save exported',
    'toast.badJson': 'That file is not readable JSON.',
    'toast.writeFail': 'Could not write the save — nothing was changed.',
    'err.notSave': 'That file is not a save.',
    'err.notMSM': 'That file is not a Mini Shopping Mall save.',
    'err.noData': 'That save has no data in it.',
    'err.oldSave': 'That save is from an older version and cannot be read.',

    'toast.tip': 'Customers show what they want — keep those shelves full',
    'pop.counter': '✨ Counter built!',
    'toast.counter': '✨ Checkout counter unlocked!',
    'pop.built': '✨ {label}!',
    'toast.built': '✨ {name} unlocked — {label} built!',
    'toast.tillFirst': 'Build the checkout counter first',
    'toast.open': '🟢 The store is OPEN!',
    'toast.closed': '🔴 Closed for now',
    'toast.firstSale': '🎉 FIRST SALE! Keep your shelves stocked!',
    'toast.milestone': 'Milestone! {name} Lv {n}',
    'toast.away': '+{n} while you were away',
    'toast.level': 'Mall level {n}! +{g} 💎',
    'toast.storeYours': '{store} is yours!',
    'toast.welcomeStore': 'Welcome to {store}',
    'toast.noCash': 'Not enough cash',
    'toast.stocker': 'Stocker hired ({a}/{b})',
    'toast.cashier': 'Cashier hired — the queue clears itself',
    'toast.boost': 'Rush hour! ×{n} prices',
    'toast.driveSaved': 'Saved to Drive',
    'toast.driveAutoOn': 'Auto-backup on',
    'toast.driveAutoOff': 'Auto-backup off',
    'toast.driveUnset': 'Drive is not set up yet — see docs/DRIVE.md',
    'toast.driveFail': 'Drive backup failed: {msg}',
    'toast.driveRead': 'Could not read Drive: {msg}',
    'err.driveNoFile': 'No save in Drive yet.',
    'err.gsi': 'Google sign-in did not load.',

    'tut.counter': 'Stand on the plot to build your counter — {cost}',
    'tut.harvest': 'Harvest potatoes — stand at the potato bed',
    'tut.shelf': 'Carry them to the potato shelf',
    'tut.sign': 'Flip the sign to OPEN your store',
    'tut.serve': 'A customer is coming — wait at the counter to serve them',
    'tut.collect': 'Collect your money!',

    'world.lv': 'Lv', 'world.goto': 'GO TO  →', 'world.locked': 'LOCKED',
    'world.checkout': '🧾 CHECKOUT',
    'world.open': 'OPEN', 'world.closed': 'CLOSED',
    'time.h': 'h', 'time.m': 'm', 'time.s': 's',
  };

  /* ------------------------------------------------------------ zh-CN */
  const ZH = {
    'dock.products': '商品', 'dock.staff': '员工',
    'dock.map': '地图', 'dock.boost': '加速',
    'title.staff': '员工', 'title.map': '地图', 'title.boost': '加速',
    'title.settings': '设置', 'title.offline': '欢迎回来！',

    'buy.max': '最大',
    'prod.build': '站到工地上建造 — {cost}',
    'prod.later': '稍后解锁',
    'prod.price': '{price} · 每 {sec} 秒一个',
    'meter.shelf': '货架', 'meter.crate': '库存',
    'prod.next': ' · 下个奖励 Lv {n}',
    'prod.maxed': ' · 已满级',
    'btn.upgrade': '升级 ×{n}',

    'staff.hint': '{store}的员工。两个都雇了，你不在时它也会赚钱。',
    'staff.stockers': '理货员 {a}/{b}',
    'staff.stockersOn': '{n} 人在场 — 多雇几个才顾得上每个货架',
    'staff.stockersOff': '自动把货从产地搬上货架',
    'staff.cashier': '收银员',
    'staff.cashierOn': '替你招呼排队的顾客',
    'staff.cashierOff': '否则你必须自己站在收银台',
    'staff.rate': '本店无人看管时',
    'btn.hired': '已雇用 ✓', 'btn.hire': '雇用',

    'map.hint': '解锁一次，之后随时来回。',
    'map.products': '{n} 种商品',
    'map.here': '• 当前',
    'map.earning': '无人看管时 {n}/秒',
    'map.needs': '需要理货员和收银员才能自动经营',
    'btn.unlock': '解锁', 'btn.youAreHere': '你在这里', 'btn.travel': '前往',

    'boost.hint': '钻石来自商场等级 — 每级 {n} 颗。',
    'boost.name': '高峰时段 ×{n}',
    'boost.active': '剩余 {n} 秒',
    'boost.sub': '{n} 秒内所有售价翻倍',
    'btn.active': '进行中', 'btn.activate': '启动',

    'set.earned': '累计收入',
    'set.earnedSub': '{n} · 已服务 {c} 位顾客',
    'set.controls': '操作',
    'set.controlsSub': '按住任意处拖动行走 · 电脑用 WASD · 滚轮缩放',
    'set.save': '存档',
    'set.saveSub': '每 10 秒自动保存，离开时也会保存',
    'set.lang': '语言',
    'set.langSub': '菜单、标签与提示',
    'set.reset': '重置进度',
    'set.resetSub': '从杂货店重新开始',
    'btn.saveNow': '立即保存', 'btn.reset': '重置',

    'bk.file': '备份文件',
    'bk.fileSub': '一个可以随身保存的 .json',
    'bk.restore': '从文件恢复',
    'bk.replaces': '会覆盖本浏览器的进度',
    'btn.export': '导出', 'btn.import': '导入',
    'drive.unset': '尚未设置 — 见 docs/DRIVE.md',
    'drive.restore': '从 Drive 恢复',
    'drive.auto': '自动备份',
    'drive.autoSub': '保存后上传，最多每分钟一次',
    'drive.last': '上次备份 {when}',
    'drive.none': 'Drive 里还没有备份',
    'drive.needSignIn': '自动备份需要登录 — 请先点一次“备份到 Drive”',
    'btn.toDrive': '备份到 Drive', 'btn.fromDrive': '从 Drive 读取',
    'btn.on': '开', 'btn.off': '关',

    'off.title': '你的员工一直在干活',
    'off.sub': '离开 {t} · 按 {p}% 计酬',
    'btn.collect': '领取',

    'toast.saved': '已保存',
    'toast.reset': '进度已重置',
    'confirm.reset': '重置全部进度？此操作无法撤销。',
    'confirm.import': '用这个存档覆盖当前进度？此操作无法撤销。',
    'confirm.drive': '用 Drive 的存档覆盖当前进度？此操作无法撤销。',
    'toast.exported': '存档已导出',
    'toast.badJson': '这个文件不是可读的 JSON。',
    'toast.writeFail': '写入存档失败 — 什么都没有改动。',
    'err.notSave': '这不是一个存档文件。',
    'err.notMSM': '这不是 Mini Shopping Mall 的存档。',
    'err.noData': '这个存档里没有数据。',
    'err.oldSave': '这个存档来自旧版本，无法读取。',

    'toast.tip': '顾客会显示他们想要什么 — 把货架补满',
    'pop.counter': '✨ 收银台建好了！',
    'toast.counter': '✨ 收银台已解锁！',
    'pop.built': '✨ {label}！',
    'toast.built': '✨ {name} 已解锁 — {label} 建好了！',
    'toast.tillFirst': '先把收银台建起来',
    'toast.open': '🟢 商店开门了！',
    'toast.closed': '🔴 暂时打烊',
    'toast.firstSale': '🎉 第一笔生意！继续补货！',
    'toast.milestone': '里程碑！{name} Lv {n}',
    'toast.away': '离开期间 +{n}',
    'toast.level': '商场 {n} 级！+{g} 💎',
    'toast.storeYours': '{store} 是你的了！',
    'toast.welcomeStore': '欢迎来到 {store}',
    'toast.noCash': '现金不足',
    'toast.stocker': '已雇用理货员（{a}/{b}）',
    'toast.cashier': '已雇用收银员 — 队伍自己就清空了',
    'toast.boost': '高峰时段！售价 ×{n}',
    'toast.driveSaved': '已备份到 Drive',
    'toast.driveAutoOn': '自动备份已开启',
    'toast.driveAutoOff': '自动备份已关闭',
    'toast.driveUnset': 'Drive 尚未设置 — 见 docs/DRIVE.md',
    'toast.driveFail': 'Drive 备份失败：{msg}',
    'toast.driveRead': '无法读取 Drive：{msg}',
    'err.driveNoFile': 'Drive 里还没有存档。',
    'err.gsi': 'Google 登录未能加载。',

    'tut.counter': '站到工地上建收银台 — {cost}',
    'tut.harvest': '收马铃薯 — 站到马铃薯田旁',
    'tut.shelf': '把它们搬到马铃薯货架',
    'tut.sign': '翻牌子把店开张',
    'tut.serve': '有顾客来了 — 到收银台等着结账',
    'tut.collect': '把钱捡起来！',

    'world.goto': '前往  →', 'world.locked': '未解锁',
    'world.checkout': '🧾 收银台',
    'world.open': '营业中', 'world.closed': '休息中',
    'time.h': '小时', 'time.m': '分', 'time.s': '秒',

    'sec.0': '蔬菜', 'sec.1': '水果', 'sec.2': '乳品与烘焙',
    'store.grocery': '杂货店', 'store.coffee': '咖啡店',
    'store.sports': '运动用品店', 'store.fashion': '时装精品店',
    'store.tech': '电子产品店',

    'prod.potato': '马铃薯', 'prod.tomato': '番茄', 'prod.carrot': '胡萝卜',
    'prod.eggplant': '茄子', 'prod.cabbage': '卷心菜', 'prod.cucumber': '黄瓜',
    'prod.watermelon': '西瓜', 'prod.strawberry': '草莓', 'prod.blueberry': '蓝莓',
    'prod.apple': '苹果', 'prod.banana': '香蕉', 'prod.orange': '橙子',
    'prod.milk': '牛奶', 'prod.egg': '鸡蛋', 'prod.bread': '面包',
    'prod.bacon': '培根', 'prod.wheat': '小麦',
    'prod.espresso': '浓缩咖啡', 'prod.latte': '拿铁',
    'prod.croissant': '可颂', 'prod.cake': '蛋糕',
    'prod.ball': '篮球', 'prod.shoes': '跑鞋', 'prod.racket': '球拍',
    'prod.jersey': '球衣', 'prod.tshirt': 'T 恤', 'prod.dress': '连衣裙',
    'prod.bag': '手提包', 'prod.watch': '手表',
    'prod.buds': '耳机', 'prod.phone': '手机', 'prod.tablet': '平板', 'prod.tv': '电视',

    'src.potato': '马铃薯田', 'src.tomato': '番茄田', 'src.carrot': '胡萝卜田',
    'src.eggplant': '茄子田', 'src.cabbage': '卷心菜田', 'src.cucumber': '黄瓜田',
    'src.watermelon': '西瓜地', 'src.strawberry': '草莓地', 'src.blueberry': '蓝莓丛',
    'src.apple': '苹果树', 'src.banana': '香蕉树', 'src.orange': '橙子树',
    'src.milk': '奶牛', 'src.egg': '鸡舍', 'src.bread': '烤炉',
    'src.bacon': '猪圈', 'src.wheat': '麦田',
  };

  /* ------------------------------------------------------------ zh-TW */
  const TW = {
    'dock.products': '商品', 'dock.staff': '員工',
    'dock.map': '地圖', 'dock.boost': '加速',
    'title.staff': '員工', 'title.map': '地圖', 'title.boost': '加速',
    'title.settings': '設定', 'title.offline': '歡迎回來！',

    'buy.max': '最大',
    'prod.build': '站到工地上興建 — {cost}',
    'prod.later': '稍後解鎖',
    'prod.price': '{price} · 每 {sec} 秒一個',
    'meter.shelf': '貨架', 'meter.crate': '庫存',
    'prod.next': ' · 下個獎勵 Lv {n}',
    'prod.maxed': ' · 已滿級',
    'btn.upgrade': '升級 ×{n}',

    'staff.hint': '{store}的員工。兩個都僱了，你不在時它也會賺錢。',
    'staff.stockers': '理貨員 {a}/{b}',
    'staff.stockersOn': '{n} 人在場 — 多僱幾個才顧得上每個貨架',
    'staff.stockersOff': '自動把貨從產地搬上貨架',
    'staff.cashier': '收銀員',
    'staff.cashierOn': '替你招呼排隊的顧客',
    'staff.cashierOff': '否則你必須自己站在收銀檯',
    'staff.rate': '本店無人看管時',
    'btn.hired': '已僱用 ✓', 'btn.hire': '僱用',

    'map.hint': '解鎖一次，之後隨時來回。',
    'map.products': '{n} 種商品',
    'map.here': '• 目前',
    'map.earning': '無人看管時 {n}/秒',
    'map.needs': '需要理貨員和收銀員才能自動經營',
    'btn.unlock': '解鎖', 'btn.youAreHere': '你在這裡', 'btn.travel': '前往',

    'boost.hint': '鑽石來自商場等級 — 每級 {n} 顆。',
    'boost.name': '尖峰時段 ×{n}',
    'boost.active': '剩餘 {n} 秒',
    'boost.sub': '{n} 秒內所有售價翻倍',
    'btn.active': '進行中', 'btn.activate': '啟動',

    'set.earned': '累計收入',
    'set.earnedSub': '{n} · 已服務 {c} 位顧客',
    'set.controls': '操作',
    'set.controlsSub': '按住任意處拖曳行走 · 電腦用 WASD · 滾輪縮放',
    'set.save': '存檔',
    'set.saveSub': '每 10 秒自動儲存，離開時也會儲存',
    'set.lang': '語言',
    'set.langSub': '選單、標籤與提示',
    'set.reset': '重置進度',
    'set.resetSub': '從雜貨店重新開始',
    'btn.saveNow': '立即儲存', 'btn.reset': '重置',

    'bk.file': '備份檔案',
    'bk.fileSub': '一個可以隨身保存的 .json',
    'bk.restore': '從檔案還原',
    'bk.replaces': '會覆蓋本瀏覽器的進度',
    'btn.export': '匯出', 'btn.import': '匯入',
    'drive.unset': '尚未設定 — 見 docs/DRIVE.md',
    'drive.restore': '從 Drive 還原',
    'drive.auto': '自動備份',
    'drive.autoSub': '儲存後上傳，最多每分鐘一次',
    'drive.last': '上次備份 {when}',
    'drive.none': 'Drive 裡還沒有備份',
    'drive.needSignIn': '自動備份需要登入 — 請先點一次「備份到 Drive」',
    'btn.toDrive': '備份到 Drive', 'btn.fromDrive': '從 Drive 讀取',
    'btn.on': '開', 'btn.off': '關',

    'off.title': '你的員工一直在幹活',
    'off.sub': '離開 {t} · 按 {p}% 計酬',
    'btn.collect': '領取',

    'toast.saved': '已儲存',
    'toast.reset': '進度已重置',
    'confirm.reset': '重置全部進度？此操作無法復原。',
    'confirm.import': '用這個存檔覆蓋目前進度？此操作無法復原。',
    'confirm.drive': '用 Drive 的存檔覆蓋目前進度？此操作無法復原。',
    'toast.exported': '存檔已匯出',
    'toast.badJson': '這個檔案不是可讀的 JSON。',
    'toast.writeFail': '寫入存檔失敗 — 什麼都沒有改動。',
    'err.notSave': '這不是一個存檔檔案。',
    'err.notMSM': '這不是 Mini Shopping Mall 的存檔。',
    'err.noData': '這個存檔裡沒有資料。',
    'err.oldSave': '這個存檔來自舊版本，無法讀取。',

    'toast.tip': '顧客會顯示他們想要什麼 — 把貨架補滿',
    'pop.counter': '✨ 收銀檯建好了！',
    'toast.counter': '✨ 收銀檯已解鎖！',
    'pop.built': '✨ {label}！',
    'toast.built': '✨ {name} 已解鎖 — {label} 建好了！',
    'toast.tillFirst': '先把收銀檯建起來',
    'toast.open': '🟢 商店開門了！',
    'toast.closed': '🔴 暫時打烊',
    'toast.firstSale': '🎉 第一筆生意！繼續補貨！',
    'toast.milestone': '里程碑！{name} Lv {n}',
    'toast.away': '離開期間 +{n}',
    'toast.level': '商場 {n} 級！+{g} 💎',
    'toast.storeYours': '{store} 是你的了！',
    'toast.welcomeStore': '歡迎來到 {store}',
    'toast.noCash': '現金不足',
    'toast.stocker': '已僱用理貨員（{a}/{b}）',
    'toast.cashier': '已僱用收銀員 — 隊伍自己就清空了',
    'toast.boost': '尖峰時段！售價 ×{n}',
    'toast.driveSaved': '已備份到 Drive',
    'toast.driveAutoOn': '自動備份已開啟',
    'toast.driveAutoOff': '自動備份已關閉',
    'toast.driveUnset': 'Drive 尚未設定 — 見 docs/DRIVE.md',
    'toast.driveFail': 'Drive 備份失敗：{msg}',
    'toast.driveRead': '無法讀取 Drive：{msg}',
    'err.driveNoFile': 'Drive 裡還沒有存檔。',
    'err.gsi': 'Google 登入未能載入。',

    'tut.counter': '站到工地上建收銀檯 — {cost}',
    'tut.harvest': '收馬鈴薯 — 站到馬鈴薯田旁',
    'tut.shelf': '把它們搬到馬鈴薯貨架',
    'tut.sign': '翻牌子把店開張',
    'tut.serve': '有顧客來了 — 到收銀檯等著結帳',
    'tut.collect': '把錢撿起來！',

    'world.goto': '前往  →', 'world.locked': '未解鎖',
    'world.checkout': '🧾 收銀檯',
    'world.open': '營業中', 'world.closed': '休息中',
    'time.h': '小時', 'time.m': '分', 'time.s': '秒',

    'sec.0': '蔬菜', 'sec.1': '水果', 'sec.2': '乳品與烘焙',
    'store.grocery': '雜貨店', 'store.coffee': '咖啡店',
    'store.sports': '運動用品店', 'store.fashion': '時裝精品店',
    'store.tech': '電子產品店',

    'prod.potato': '馬鈴薯', 'prod.tomato': '番茄', 'prod.carrot': '胡蘿蔔',
    'prod.eggplant': '茄子', 'prod.cabbage': '高麗菜', 'prod.cucumber': '小黃瓜',
    'prod.watermelon': '西瓜', 'prod.strawberry': '草莓', 'prod.blueberry': '藍莓',
    'prod.apple': '蘋果', 'prod.banana': '香蕉', 'prod.orange': '柳橙',
    'prod.milk': '牛奶', 'prod.egg': '雞蛋', 'prod.bread': '麵包',
    'prod.bacon': '培根', 'prod.wheat': '小麥',
    'prod.espresso': '濃縮咖啡', 'prod.latte': '拿鐵',
    'prod.croissant': '可頌', 'prod.cake': '蛋糕',
    'prod.ball': '籃球', 'prod.shoes': '跑鞋', 'prod.racket': '球拍',
    'prod.jersey': '球衣', 'prod.tshirt': 'T 恤', 'prod.dress': '洋裝',
    'prod.bag': '手提包', 'prod.watch': '手錶',
    'prod.buds': '耳機', 'prod.phone': '手機', 'prod.tablet': '平板', 'prod.tv': '電視',

    'src.potato': '馬鈴薯田', 'src.tomato': '番茄田', 'src.carrot': '胡蘿蔔田',
    'src.eggplant': '茄子田', 'src.cabbage': '高麗菜田', 'src.cucumber': '小黃瓜田',
    'src.watermelon': '西瓜地', 'src.strawberry': '草莓地', 'src.blueberry': '藍莓叢',
    'src.apple': '蘋果樹', 'src.banana': '香蕉樹', 'src.orange': '柳橙樹',
    'src.milk': '乳牛', 'src.egg': '雞舍', 'src.bread': '烤爐',
    'src.bacon': '豬圈', 'src.wheat': '麥田',
  };

  /* --------------------------------------------------------------- ms */
  const MS = {
    'dock.products': 'Produk', 'dock.staff': 'Pekerja',
    'dock.map': 'Peta', 'dock.boost': 'Boost',
    'title.staff': 'Pekerja', 'title.map': 'Peta', 'title.boost': 'Boost',
    'title.settings': 'Tetapan', 'title.offline': 'Selamat kembali!',

    'buy.max': 'Maks',
    'prod.build': 'Berdiri di tapaknya untuk bina — {cost}',
    'prod.later': 'Terbuka kemudian',
    'prod.price': '{price} · setiap {sec}s',
    'meter.shelf': 'Rak', 'meter.crate': 'Stok',
    'prod.next': ' · bonus seterusnya Lv {n}',
    'prod.maxed': ' · penuh',
    'btn.upgrade': 'Naik taraf ×{n}',

    'staff.hint': 'Pekerja untuk {store}. Ambil kedua-duanya dan ia terus untung walaupun anda tiada.',
    'staff.stockers': 'Penyusun {a}/{b}',
    'staff.stockersOn': '{n} sedang bertugas — ambil lagi supaya setiap rak terisi',
    'staff.stockersOff': 'Bawa barang dari stesen ke rak untuk anda',
    'staff.cashier': 'Juruwang',
    'staff.cashierOn': 'Melayan barisan tanpa anda',
    'staff.cashierOff': 'Jika tidak, anda sendiri kena berdiri di kaunter',
    'staff.rate': 'Kedai ini, tanpa dijaga',
    'btn.hired': 'Diambil ✓', 'btn.hire': 'Ambil',

    'map.hint': 'Buka kedai sekali sahaja, kemudian ulang-alik bila-bila masa.',
    'map.products': '{n} produk',
    'map.here': '• di sini',
    'map.earning': 'dapat {n}/s tanpa dijaga',
    'map.needs': 'perlu penyusun dan juruwang untuk jalan sendiri',
    'btn.unlock': 'Buka', 'btn.youAreHere': 'Anda di sini', 'btn.travel': 'Pergi',

    'boost.hint': 'Gem datang dari tahap mall — {n} setiap tahap.',
    'boost.name': 'Waktu Sibuk ×{n}',
    'boost.active': 'Aktif {n}s lagi',
    'boost.sub': 'Gandakan setiap harga jualan selama {n}s',
    'btn.active': 'Aktif', 'btn.activate': 'Aktifkan',

    'set.earned': 'Jumlah pendapatan',
    'set.earnedSub': '{n} · {c} pelanggan dilayan',
    'set.controls': 'Kawalan',
    'set.controlsSub': 'Seret di mana-mana untuk berjalan · WASD di desktop · skrol untuk zum',
    'set.save': 'Simpan',
    'set.saveSub': 'Simpan automatik setiap 10s dan semasa anda keluar',
    'set.lang': 'Bahasa',
    'set.langSub': 'Menu, label dan petua',
    'set.reset': 'Set semula kemajuan',
    'set.resetSub': 'Mula semula dari kedai runcit',
    'btn.saveNow': 'Simpan sekarang', 'btn.reset': 'Set semula',

    'bk.file': 'Fail sandaran',
    'bk.fileSub': 'Satu .json yang boleh anda simpan di mana-mana',
    'bk.restore': 'Pulih dari fail',
    'bk.replaces': 'Menggantikan kemajuan dalam pelayar ini',
    'btn.export': 'Eksport', 'btn.import': 'Import',
    'drive.unset': 'Belum disediakan — lihat docs/DRIVE.md',
    'drive.restore': 'Pulih dari Drive',
    'drive.auto': 'Sandaran automatik',
    'drive.autoSub': 'Hantar selepas simpan, paling kerap seminit sekali',
    'drive.last': 'Salinan terakhir {when}',
    'drive.none': 'Belum ada salinan dalam Drive',
    'drive.needSignIn': 'Sandaran automatik perlu anda log masuk — tekan "Ke Drive" sekali',
    'btn.toDrive': 'Ke Drive', 'btn.fromDrive': 'Dari Drive',
    'btn.on': 'Hidup', 'btn.off': 'Mati',

    'off.title': 'Pekerja anda terus bekerja',
    'off.sub': '{t} tiada · dibayar pada kadar {p}%',
    'btn.collect': 'Kutip',

    'toast.saved': 'Disimpan',
    'toast.reset': 'Kemajuan diset semula',
    'confirm.reset': 'Set semula semua kemajuan? Ini tidak boleh dibatalkan.',
    'confirm.import': 'Ganti kemajuan semasa dengan simpanan ini? Ini tidak boleh dibatalkan.',
    'confirm.drive': 'Ganti kemajuan semasa dengan simpanan Drive? Ini tidak boleh dibatalkan.',
    'toast.exported': 'Simpanan dieksport',
    'toast.badJson': 'Fail itu bukan JSON yang boleh dibaca.',
    'toast.writeFail': 'Gagal menulis simpanan — tiada apa yang berubah.',
    'err.notSave': 'Fail itu bukan fail simpanan.',
    'err.notMSM': 'Fail itu bukan simpanan Mini Shopping Mall.',
    'err.noData': 'Simpanan itu tiada data.',
    'err.oldSave': 'Simpanan itu dari versi lama dan tidak boleh dibaca.',

    'toast.tip': 'Pelanggan tunjuk apa yang mereka mahu — pastikan rak penuh',
    'pop.counter': '✨ Kaunter siap!',
    'toast.counter': '✨ Kaunter bayaran terbuka!',
    'pop.built': '✨ {label}!',
    'toast.built': '✨ {name} terbuka — {label} siap dibina!',
    'toast.tillFirst': 'Bina kaunter bayaran dahulu',
    'toast.open': '🟢 Kedai kini BUKA!',
    'toast.closed': '🔴 Tutup buat masa ini',
    'toast.firstSale': '🎉 JUALAN PERTAMA! Pastikan rak sentiasa penuh!',
    'toast.milestone': 'Pencapaian! {name} Lv {n}',
    'toast.away': '+{n} semasa anda tiada',
    'toast.level': 'Mall tahap {n}! +{g} 💎',
    'toast.storeYours': '{store} kini milik anda!',
    'toast.welcomeStore': 'Selamat datang ke {store}',
    'toast.noCash': 'Duit tidak cukup',
    'toast.stocker': 'Penyusun diambil ({a}/{b})',
    'toast.cashier': 'Juruwang diambil — barisan selesai sendiri',
    'toast.boost': 'Waktu sibuk! Harga ×{n}',
    'toast.driveSaved': 'Disimpan ke Drive',
    'toast.driveAutoOn': 'Sandaran automatik dihidupkan',
    'toast.driveAutoOff': 'Sandaran automatik dimatikan',
    'toast.driveUnset': 'Drive belum disediakan — lihat docs/DRIVE.md',
    'toast.driveFail': 'Sandaran Drive gagal: {msg}',
    'toast.driveRead': 'Tidak dapat membaca Drive: {msg}',
    'err.driveNoFile': 'Belum ada simpanan dalam Drive.',
    'err.gsi': 'Log masuk Google tidak dimuatkan.',

    'tut.counter': 'Berdiri di tapak untuk bina kaunter anda — {cost}',
    'tut.harvest': 'Petik kentang — berdiri di petak kentang',
    'tut.shelf': 'Bawa ke rak kentang',
    'tut.sign': 'Pusing papan tanda untuk BUKA kedai',
    'tut.serve': 'Pelanggan sedang datang — tunggu di kaunter untuk melayan',
    'tut.collect': 'Kutip duit anda!',

    'world.goto': 'PERGI  →', 'world.locked': 'BERKUNCI',
    'world.checkout': '🧾 KAUNTER',
    'world.open': 'BUKA', 'world.closed': 'TUTUP',

    'sec.0': 'SAYUR', 'sec.1': 'BUAH', 'sec.2': 'SUSU & ROTI',
    'store.grocery': 'Kedai Runcit', 'store.coffee': 'Kedai Kopi',
    'store.sports': 'Kedai Sukan', 'store.fashion': 'Butik Fesyen',
    'store.tech': 'Kedai Elektronik',

    'prod.potato': 'Kentang', 'prod.tomato': 'Tomato', 'prod.carrot': 'Lobak Merah',
    'prod.eggplant': 'Terung', 'prod.cabbage': 'Kubis', 'prod.cucumber': 'Timun',
    'prod.watermelon': 'Tembikai', 'prod.strawberry': 'Strawberi', 'prod.blueberry': 'Beri Biru',
    'prod.apple': 'Epal', 'prod.banana': 'Pisang', 'prod.orange': 'Oren',
    'prod.milk': 'Susu', 'prod.egg': 'Telur', 'prod.bread': 'Roti',
    'prod.bacon': 'Bakon', 'prod.wheat': 'Gandum',
    'prod.espresso': 'Espresso', 'prod.latte': 'Latte',
    'prod.croissant': 'Croissant', 'prod.cake': 'Kek',
    'prod.ball': 'Bola Keranjang', 'prod.shoes': 'Kasut Sukan', 'prod.racket': 'Raket',
    'prod.jersey': 'Jersi', 'prod.tshirt': 'Baju-T', 'prod.dress': 'Gaun',
    'prod.bag': 'Beg Tangan', 'prod.watch': 'Jam Tangan',
    'prod.buds': 'Fon Telinga', 'prod.phone': 'Telefon', 'prod.tablet': 'Tablet',
    'prod.tv': 'TV',

    'src.potato': 'Petak Kentang', 'src.tomato': 'Petak Tomato', 'src.carrot': 'Petak Lobak',
    'src.eggplant': 'Petak Terung', 'src.cabbage': 'Petak Kubis', 'src.cucumber': 'Petak Timun',
    'src.watermelon': 'Kebun Tembikai', 'src.strawberry': 'Kebun Strawberi',
    'src.blueberry': 'Pokok Beri Biru',
    'src.apple': 'Pokok Epal', 'src.banana': 'Pokok Pisang', 'src.orange': 'Pokok Oren',
    'src.milk': 'Lembu', 'src.egg': 'Reban Ayam', 'src.bread': 'Ketuhar',
    'src.bacon': 'Kandang Babi', 'src.wheat': 'Ladang Gandum',
  };

  const PACKS = { en: EN, 'zh-CN': ZH, 'zh-TW': TW, ms: MS };

  /* The browser's own preference, used only until the player picks one. */
  function detect() {
    const list = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || 'en'];
    for (const raw of list) {
      const l = String(raw).toLowerCase();
      if (l.indexOf('zh') === 0) return /hant|tw|hk|mo/.test(l) ? 'zh-TW' : 'zh-CN';
      if (l.indexOf('ms') === 0 || l.indexOf('id') === 0) return 'ms';
      if (l.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }

  const I = MSM.i18n = {
    LANGS: [
      { id: 'en',    label: 'English' },
      { id: 'zh-CN', label: '简体中文' },
      { id: 'zh-TW', label: '繁體中文' },
      { id: 'ms',    label: 'Bahasa Melayu' },
    ],
    lang: 'en',

    /** A UI string. Missing keys fall through to English, then to the key. */
    t(key, p) {
      const pack = PACKS[I.lang] || EN;
      let s = pack[key];
      if (s == null) s = EN[key];
      if (s == null) return key;
      if (p) s = s.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m));
      return s;
    },

    /** A name out of config.js, falling back to the English original. */
    name(key, fallback) {
      const pack = PACKS[I.lang] || EN;
      return pack[key] || EN[key] || fallback;
    },

    /* Write the active language's names into MSM.CFG. The English original
       is kept in __en, so switching back and forth never loses it. */
    localizeConfig() {
      const CFG = MSM.CFG;
      if (!CFG) return;
      (CFG.PLAN.sections || []).forEach((z, i) => {
        if (z.__en == null) z.__en = z.name;
        z.name = I.name('sec.' + i, z.__en);
      });
      CFG.STORES.forEach((store) => {
        if (store.__en == null) store.__en = store.name;
        store.name = I.name('store.' + store.id, store.__en);
        store.products.forEach((p) => {
          if (p.__en == null) p.__en = p.name;
          p.name = I.name('prod.' + p.id, p.__en);
          if (!p.source) return;
          if (p.source.__en == null) p.source.__en = p.source.label;
          // a 'maker' source has no name of its own — config.js copied the
          // product's, so it must follow the product into the new language
          p.source.label = I.name('src.' + p.id,
            p.source.kind === 'maker' ? p.name : p.source.__en);
        });
      });
    },

    /** Static DOM text: anything carrying data-i18n. */
    applyDom() {
      document.documentElement.lang = I.lang;
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = I.t(el.dataset.i18n);
      });
    },

    setLang(id) {
      if (!PACKS[id] || id === I.lang) return;
      I.lang = id;
      try { localStorage.setItem(KEY, id); } catch (e) { /* private mode */ }
      I.localizeConfig();
      I.applyDom();
      if (MSM.ui && MSM.ui.mode) MSM.ui.open(MSM.ui.mode, MSM.ui.arg);
    },

    init() {
      let saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
      I.lang = (saved && PACKS[saved]) ? saved : detect();
      I.localizeConfig();
      I.applyDom();
    },
  };

  MSM.t = (key, p) => I.t(key, p);
})();
