import assert from 'node:assert/strict';

// 测试：研学仓库现有物资与区块管理核心业务逻辑

// 1. 模拟物料数据
const testMaterials = [
  {
    id: 'm1',
    name: '手工编织斗笠草帽',
    zone: 'A区-传统农具农械库',
    category: '农耕工具',
    quantity: 60,
    unit: '顶',
    safeQuantity: 20,
    specification: '手工竹编带防风系带',
    status: 'normal',
    note: '悬挂于 A区-01号农具墙',
  },
  {
    id: 'm2',
    name: '传统双耳青石小石磨',
    zone: 'D区-农耕烘焙手作室',
    category: '农耕工具',
    quantity: 8,
    unit: '台',
    safeQuantity: 2,
    specification: '直径20cm 天然青石',
    status: 'normal',
    note: '烘焙手作台专用',
  },
  {
    id: 'm3',
    name: '扎染天然植物蓼蓝染液',
    zone: 'B区-非遗手工扎染坊',
    category: '手工非遗',
    quantity: 3,
    unit: '瓶',
    safeQuantity: 5, // 低于安全库存
    specification: '500ml 纯天然植物萃取',
    status: 'normal',
    note: '避光保存',
  },
  {
    id: 'm4',
    name: '儿童防刺防滑农耕手套',
    zone: '', // 未分配区块
    category: '防护安全',
    quantity: 0, // 缺货
    unit: '双',
    safeQuantity: 30,
    specification: '乳胶加厚耐磨',
    status: 'normal',
    note: '总务箱待分拣',
  },
];

// 2. 统计指标计算测试
function computeStats(list) {
  const zoneSet = new Set();
  let totalQty = 0;
  let lowStockCount = 0;

  for (const item of list) {
    if (item.zone.trim()) zoneSet.add(item.zone.trim());
    totalQty += item.quantity;
    if (item.quantity === 0 || (item.safeQuantity > 0 && item.quantity <= item.safeQuantity)) {
      lowStockCount++;
    }
  }

  return {
    totalKinds: list.length,
    totalQuantity: totalQty,
    zoneCount: zoneSet.size,
    lowStockCount,
    zones: Array.from(zoneSet).sort(),
  };
}

const stats = computeStats(testMaterials);
assert.equal(stats.totalKinds, 4, '品类数应为 4');
assert.equal(stats.totalQuantity, 71, '总库存应为 60+8+3+0 = 71');
assert.equal(stats.zoneCount, 3, '区块数应为 3 (A区, B区, D区)');
assert.equal(stats.lowStockCount, 2, '待补货应为 2 (蓼蓝染液低于安全库存5，手套缺货0)');

// 3. 区块与品名关键词模糊过滤逻辑测试
function filterMaterials(list, query, zone) {
  return list.filter((item) => {
    if (query) {
      const q = query.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.zone.toLowerCase().includes(q) ||
        item.specification.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (zone && zone !== 'all') {
      if (zone === '__unassigned__') {
        if (item.zone.trim() !== '') return false;
      } else if (item.zone !== zone) {
        return false;
      }
    }
    return true;
  });
}

// 搜区块关键字 "扎染坊"
const matchedByZone = filterMaterials(testMaterials, '扎染坊', 'all');
assert.equal(matchedByZone.length, 1);
assert.equal(matchedByZone[0].id, 'm3');

// 搜未分配区块
const unassigned = filterMaterials(testMaterials, '', '__unassigned__');
assert.equal(unassigned.length, 1);
assert.equal(unassigned[0].id, 'm4');

// 4. 活动所需物资与仓库明细及所在区块的智能匹配测试
function matchWarehouseItem(whList, activityMaterialName) {
  const clean = activityMaterialName.trim().toLowerCase();
  const exact = whList.find((w) => w.name.trim().toLowerCase() === clean);
  if (exact) return exact;
  return whList.find((w) => clean.includes(w.name.trim().toLowerCase()) || w.name.trim().toLowerCase().includes(clean)) || null;
}

const matched1 = matchWarehouseItem(testMaterials, '草帽');
assert.ok(matched1, '活动所需「草帽」应模糊匹配到仓库中的「手工编织斗笠草帽」');
assert.equal(matched1.zone, 'A区-传统农具农械库');

const matched2 = matchWarehouseItem(testMaterials, '传统双耳青石小石磨');
assert.ok(matched2, '精确匹配小石磨');
assert.equal(matched2.zone, 'D区-农耕烘焙手作室');

console.log('Passed: warehouse materials stats, zone extraction, search filtering, and activity-warehouse matching.');
