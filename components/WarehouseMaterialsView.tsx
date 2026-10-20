'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  Sparkles,
  Boxes,
  Layers,
  Warehouse,
  Check,
  X,
  RefreshCw,
  Info
} from 'lucide-react';

export type WarehouseMaterial = {
  id: string;
  name: string;
  zone: string;
  category: string;
  quantity: number;
  unit: string;
  safeQuantity: number;
  specification: string;
  unitPrice: number;
  supplier: string;
  status: string;
  note: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

interface WarehouseMaterialsViewProps {
  canEdit: boolean;
  onMaterialsLoaded?: (materials: WarehouseMaterial[]) => void;
}

// 推荐的常见研学仓储区块预设（供快速点选与一键填充）
const COMMON_ZONES = [
  '西门隔壁仓库',
  '摩天轮仓库',
  '稻田餐厅仓库',
  '小森林营地仓库',
];

// 常见分类
const COMMON_CATEGORIES = [
  '农耕工具',
  '手工非遗',
  '自然科普',
  '防护安全',
  '日常耗材',
  '活动道具',
  '教学教具',
];

// 常用计量单位
const COMMON_UNITS = ['件', '把', '套', '顶', '个', '双', '卷', '包', '箱', '台', '条'];

// 常见江南农耕研学初始物料包
const PRESET_MATERIALS: Omit<WarehouseMaterial, 'id' | 'updatedByEmail' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '手工编织斗笠草帽',
    zone: '西门隔壁仓库',
    category: '农耕工具',
    quantity: 60,
    unit: '顶',
    safeQuantity: 20,
    specification: '手工竹编带防风系带 儿童/成人通用',
    unitPrice: 15,
    supplier: '本地竹编工艺合作社',
    status: 'normal',
    note: '悬挂于 西门隔壁仓库-01号农具墙',
  },
  {
    name: '儿童便携竹编小背篓',
    zone: '西门隔壁仓库',
    category: '农耕工具',
    quantity: 45,
    unit: '个',
    safeQuantity: 15,
    specification: '天然竹篾手工细编 双肩软绳背带',
    unitPrice: 28,
    supplier: '本地竹编工艺合作社',
    status: 'normal',
    note: '存放于 西门隔壁仓库置物架第二层整理箱',
  },
  {
    name: '儿童防刺防滑农耕手套',
    zone: '小森林营地仓库',
    category: '防护安全',
    quantity: 120,
    unit: '双',
    safeQuantity: 40,
    specification: '乳胶加厚耐磨防刺透气 S/M码',
    unitPrice: 4.5,
    supplier: '劳保批发商城',
    status: 'normal',
    note: '存放于 小森林营地仓库-02整理箱按尺码分装',
  },
  {
    name: '迷你木柄小铁锹',
    zone: '西门隔壁仓库',
    category: '农耕工具',
    quantity: 50,
    unit: '把',
    safeQuantity: 15,
    specification: '加厚锰钢钝化安全边 橡木圆滑短柄',
    unitPrice: 12,
    supplier: '农具五金制造厂',
    status: 'normal',
    note: '立于 西门隔壁仓库工具箱01号内',
  },
  {
    name: '家用传统双耳青石小石磨',
    zone: '稻田餐厅仓库',
    category: '农耕工具',
    quantity: 8,
    unit: '台',
    safeQuantity: 2,
    specification: '天然青石材质 直径20cm 搭配实木手柄',
    unitPrice: 160,
    supplier: '传统石雕工艺坊',
    status: 'normal',
    note: '放置于 稻田餐厅仓库专用石磨台',
  },
  {
    name: '扎染天然植物蓼蓝染液',
    zone: '摩天轮仓库',
    category: '手工非遗',
    quantity: 16,
    unit: '瓶',
    safeQuantity: 5,
    specification: '500ml 纯天然植物萃取 无刺激',
    unitPrice: 35,
    supplier: '非遗植物染色工坊',
    status: 'normal',
    note: '避光存放于 摩天轮仓库非遗原料柜下层',
  },
  {
    name: '扎染高密纯棉未漂白方巾',
    zone: '摩天轮仓库',
    category: '手工非遗',
    quantity: 180,
    unit: '条',
    safeQuantity: 50,
    specification: '50x50cm 纯棉细纱卷边 易上色',
    unitPrice: 3.2,
    supplier: '纯棉布业批发',
    status: 'normal',
    note: '防潮密封存放于 摩天轮仓库01物料箱',
  },
  {
    name: '植物拓印纯棉帆布手提袋',
    zone: '摩天轮仓库',
    category: '手工非遗',
    quantity: 95,
    unit: '个',
    safeQuantity: 30,
    specification: '12安纯棉本色帆布 32x36cm',
    unitPrice: 5.5,
    supplier: '帆布包装直营店',
    status: 'normal',
    note: '存放于 摩天轮仓库拓印物料架',
  },
  {
    name: '植物拓印橡胶双头小木槌',
    zone: '摩天轮仓库',
    category: '手工非遗',
    quantity: 35,
    unit: '把',
    safeQuantity: 10,
    specification: '实木手柄搭配耐磨橡胶敲击头',
    unitPrice: 8,
    supplier: '手作工具工坊',
    status: 'normal',
    note: '存放于 摩天轮仓库木盒工具篮',
  },
  {
    name: '便携无线领夹扩音器(小蜜蜂)',
    zone: '小森林营地仓库',
    category: '活动道具',
    quantity: 6,
    unit: '台',
    safeQuantity: 2,
    specification: '无线一拖二 UHF高清降噪 双锂电池',
    unitPrice: 180,
    supplier: '电子数码直营',
    status: 'normal',
    note: '存放于 小森林营地仓库充电收纳柜',
  },
  {
    name: '研学应急随队医疗急救包',
    zone: '小森林营地仓库',
    category: '防护安全',
    quantity: 4,
    unit: '套',
    safeQuantity: 2,
    specification: '含碘伏棉棒、弹性创口贴、医用冰袋、防中暑清凉油',
    unitPrice: 85,
    supplier: '医药器械连锁',
    status: 'normal',
    note: '放置于 小森林营地仓库进门显眼急救挂架',
  },
];

export function WarehouseMaterialsView({ canEdit, onMaterialsLoaded }: WarehouseMaterialsViewProps) {
  const [materials, setMaterials] = useState<WarehouseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // 筛选与检索状态
  const [query, setQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'normal' | 'low' | 'empty'>('all');

  // 就地内联编辑所在区块 (Inline Edit Zone)
  const [inlineEditingZoneId, setInlineEditingZoneId] = useState<string | null>(null);
  const [inlineZoneValue, setInlineZoneValue] = useState('');
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);

  // 弹窗表单状态 (新增 / 编辑详情)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    zone: '',
    category: '农耕工具',
    quantity: 10,
    unit: '件',
    safeQuantity: 10,
    specification: '',
    unitPrice: 0,
    supplier: '',
    status: 'normal',
    note: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // 加载仓库物资数据
  const fetchMaterials = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/learning-warehouse', { cache: 'no-store' });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '获取仓库物资失败');
      const list: WarehouseMaterial[] = data.items || [];
      setMaterials(list);
      onMaterialsLoaded?.(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取仓库物资失败');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMaterials();
  }, []);

  // 成功提示倒计时清除
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // 计算提取所有已有区块列表（去重且排序）
  const existingZones = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.zone.trim()) set.add(m.zone.trim());
    });
    return Array.from(set).sort();
  }, [materials]);

  // 计算提取所有已有分类
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.category.trim()) set.add(m.category.trim());
    });
    return Array.from(set).sort();
  }, [materials]);

  // 统计指标看板数据
  const stats = useMemo(() => {
    let totalQty = 0;
    let lowCount = 0;
    let emptyCount = 0;
    materials.forEach((m) => {
      totalQty += m.quantity;
      if (m.quantity === 0) {
        emptyCount++;
      } else if (m.quantity <= m.safeQuantity && m.safeQuantity > 0) {
        lowCount++;
      }
    });

    return {
      totalKinds: materials.length,
      totalQuantity: Math.round(totalQty * 100) / 100,
      totalZones: existingZones.length,
      lowOrEmpty: lowCount + emptyCount,
    };
  }, [materials, existingZones]);

  // 筛选过滤物资
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // 关键词检索
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesZone = item.zone.toLowerCase().includes(q);
        const matchesSpec = item.specification.toLowerCase().includes(q);
        const matchesNote = item.note.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesZone && !matchesSpec && !matchesNote && !matchesCategory) {
          return false;
        }
      }

      // 区块筛选
      if (selectedZone !== 'all') {
        if (selectedZone === '__unassigned__') {
          if (item.zone.trim() !== '') return false;
        } else if (item.zone !== selectedZone) {
          return false;
        }
      }

      // 分类筛选
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 库存状态筛选
      if (selectedStockStatus === 'normal') {
        if (item.quantity === 0 || (item.safeQuantity > 0 && item.quantity <= item.safeQuantity)) return false;
      } else if (selectedStockStatus === 'low') {
        if (item.quantity === 0 || !(item.safeQuantity > 0 && item.quantity <= item.safeQuantity)) return false;
      } else if (selectedStockStatus === 'empty') {
        if (item.quantity > 0) return false;
      }

      return true;
    });
  }, [materials, query, selectedZone, selectedCategory, selectedStockStatus]);

  // 按区块组织物资（当按区块查看时更一目了然）
  const groupedByZone = useMemo(() => {
    const map = new Map<string, WarehouseMaterial[]>();
    filteredMaterials.forEach((item) => {
      const z = item.zone.trim() || '未分配区块';
      const arr = map.get(z) || [];
      arr.push(item);
      map.set(z, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === '未分配区块') return 1;
      if (b[0] === '未分配区块') return -1;
      return a[0].localeCompare(b[0], 'zh-CN');
    });
  }, [filteredMaterials]);

  // 打开新增弹窗
  const handleOpenAddModal = (presetZone = '') => {
    setEditingItem(null);
    setFormData({
      name: '',
      zone: presetZone || (selectedZone !== 'all' && selectedZone !== '__unassigned__' ? selectedZone : ''),
      category: selectedCategory !== 'all' ? selectedCategory : '农耕工具',
      quantity: 10,
      unit: '件',
      safeQuantity: 5,
      specification: '',
      unitPrice: 0,
      supplier: '',
      status: 'normal',
      note: '',
    });
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (item: WarehouseMaterial) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      zone: item.zone,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      safeQuantity: item.safeQuantity,
      specification: item.specification,
      unitPrice: item.unitPrice,
      supplier: item.supplier,
      status: item.status,
      note: item.note,
    });
    setIsModalOpen(true);
  };

  // 保存新增或编辑
  const handleSaveForm = async (stayOpenToAddMore = false) => {
    if (!formData.name.trim()) {
      alert('请填写物资名称');
      return;
    }
    setFormSubmitting(true);
    try {
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        ...formData,
      };

      const res = await fetch('/api/learning-warehouse', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = (await res.json()) as any;
      if (!res.ok) throw new Error(resJson.error || '保存失败');

      setActionSuccess(editingItem ? `物资「${formData.name}」已成功更新` : `新物资「${formData.name}」已成功入库`);
      await fetchMaterials(false);

      if (stayOpenToAddMore && !editingItem) {
        // 保留所在区块和分类，方便继续批量录入该区块的其他物资
        setFormData((prev) => ({
          ...prev,
          name: '',
          quantity: 10,
          specification: '',
          note: '',
        }));
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  // 快速内联就地修改所在区块 (Direct Inline Edit for Zone)
  const handleStartInlineEditZone = (item: WarehouseMaterial) => {
    if (!canEdit) return;
    setInlineEditingZoneId(item.id);
    setInlineZoneValue(item.zone);
  };

  const handleSaveInlineZone = async (item: WarehouseMaterial) => {
    const trimmed = inlineZoneValue.trim();
    if (trimmed === item.zone) {
      setInlineEditingZoneId(null);
      return;
    }
    setSavingZoneId(item.id);
    try {
      const res = await fetch('/api/learning-warehouse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, zone: trimmed }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '保存区块失败');

      setMaterials((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, zone: trimmed, updatedAt: new Date().toISOString() } : m))
      );
      setActionSuccess(`物资「${item.name}」所在区块已更新为：${trimmed || '未指定'}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存区块失败');
    } finally {
      setSavingZoneId(null);
      setInlineEditingZoneId(null);
    }
  };

  // 快速增减库存
  const handleQuickAdjustQty = async (item: WarehouseMaterial, delta: number) => {
    if (!canEdit) return;
    const nextQty = Math.max(0, Math.round((item.quantity + delta) * 100) / 100);
    if (nextQty === item.quantity) return;

    try {
      const res = await fetch('/api/learning-warehouse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, quantity: nextQty }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '调整库存失败');

      setMaterials((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, quantity: nextQty, updatedAt: new Date().toISOString() } : m))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '调整库存失败');
    }
  };

  // 删除物资
  const handleDeleteMaterial = async (item: WarehouseMaterial) => {
    if (!canEdit) return;
    if (!confirm(`确定要从研学仓库明细中删除物资「${item.name}」吗？此操作不可撤销。`)) {
      return;
    }
    try {
      const res = await fetch('/api/learning-warehouse', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '删除失败');

      setActionSuccess(`物资「${item.name}」已从仓库移除`);
      await fetchMaterials(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 一键预置常见研学农耕物料包
  const handleSeedPresets = async () => {
    if (!canEdit) return;
    if (
      !confirm(
        '即将向研学仓库导入【江南农耕研学常见物资推荐库】（含草帽、石磨、小背篓、扎染布料等经典物料及其对应所在区块），是否确认？'
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/learning-warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: PRESET_MATERIALS }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || '导入预设物料失败');

      setActionSuccess(`已成功导入 ${PRESET_MATERIALS.length} 种经典农耕研学物资与存放区块！`);
      await fetchMaterials();
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
      setLoading(false);
    }
  };

  // 导出 CSV / 表格清单
  const handleExportCsv = () => {
    if (materials.length === 0) {
      alert('仓库暂无物资可导出');
      return;
    }
    const header = ['物资品名', '所在区块', '物资分类', '现有库存', '单位', '安全库存', '规格型号', '状态', '存放备注'];
    const rows = materials.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.zone.replace(/"/g, '""')}"`,
      `"${m.category.replace(/"/g, '""')}"`,
      m.quantity,
      `"${m.unit.replace(/"/g, '""')}"`,
      m.safeQuantity,
      `"${m.specification.replace(/"/g, '""')}"`,
      m.quantity === 0 ? '缺货' : m.quantity <= m.safeQuantity ? '库存紧张' : '充足正常',
      `"${m.note.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `江南农耕研学仓库物资明细_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 成功操作浮动通知 */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-[#27563c] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 顶部数据看板卡片 */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-xs">
          <span className="text-xs text-[#5d6e62] font-medium flex items-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5 text-[#27563c]" />
            <span>物资品类总数</span>
          </span>
          <strong className="block text-2xl font-extrabold text-[#1e2c22] mt-1.5">
            {stats.totalKinds} <small className="text-xs font-normal text-[#5d6e62]">种</small>
          </strong>
          <span className="text-[11px] text-[#8b998e] mt-0.5 block">在库管理道具与耗材</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-xs">
          <span className="text-xs text-[#5d6e62] font-medium flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
            <span>现存库存总量</span>
          </span>
          <strong className="block text-2xl font-extrabold text-[#27563c] mt-1.5">
            {stats.totalQuantity} <small className="text-xs font-normal text-[#5d6e62]">件/套</small>
          </strong>
          <span className="text-[11px] text-[#8b998e] mt-0.5 block">全库累计实物在库数</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-xs">
          <span className="text-xs text-[#5d6e62] font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>覆盖仓储区块</span>
          </span>
          <strong className="block text-2xl font-extrabold text-blue-800 mt-1.5">
            {stats.totalZones} <small className="text-xs font-normal text-[#5d6e62]">个库区</small>
          </strong>
          <span className="text-[11px] text-[#8b998e] mt-0.5 block">包含农具、手作等功能区</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-xs">
          <span className="text-xs text-[#5d6e62] font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>待补货/低库存</span>
          </span>
          <strong
            className={`block text-2xl font-extrabold mt-1.5 ${
              stats.lowOrEmpty > 0 ? 'text-amber-600' : 'text-emerald-700'
            }`}
          >
            {stats.lowOrEmpty} <small className="text-xs font-normal text-[#5d6e62]">项</small>
          </strong>
          <span className="text-[11px] text-[#8b998e] mt-0.5 block">
            {stats.lowOrEmpty > 0 ? '需采购或准备补充' : '当前库存储备充足'}
          </span>
        </div>
      </section>

      {/* 筛选与操作工具条 */}
      <div className="p-4 rounded-xl bg-white border border-[#e3ded2] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b998e]" />
            <input
              type="text"
              placeholder="搜索物资品名、所在区块、规格型号、备注..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8b998e] hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 右侧动作按钮组 */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => window.print()}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#5d6e62] flex items-center gap-1.5 transition-colors shadow-xs"
              title="打印仓库盘点清单"
            >
              <Printer className="w-3.5 h-3.5 text-[#27563c]" />
              <span>打印盘点单</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] hover:bg-white text-[#5d6e62] flex items-center gap-1.5 transition-colors shadow-xs"
              title="导出仓库物资 CSV 表格"
            >
              <Download className="w-3.5 h-3.5 text-[#27563c]" />
              <span>导出表格</span>
            </button>

            {canEdit && materials.length === 0 && (
              <button
                onClick={handleSeedPresets}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>导入常用农耕物资库</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => handleOpenAddModal()}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#27563c] hover:bg-[#1f4530] text-white flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>录入新物资</span>
              </button>
            )}
          </div>
        </div>

        {/* 快捷过滤药丸条 (区块筛选 + 分类筛选 + 状态筛选) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f1eee5] text-xs">
          <div className="flex items-center gap-1.5 text-[#5d6e62] font-medium mr-1">
            <Filter className="w-3.5 h-3.5 text-[#27563c]" />
            <span>筛选:</span>
          </div>

          {/* 区块筛选下拉 */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-md border border-[#e3ded2] bg-[#f8f7f2] text-[#1e2c22] focus:outline-none focus:border-[#27563c]"
          >
            <option value="all">📍 全部区块 ({existingZones.length})</option>
            {existingZones.map((z) => (
              <option key={z} value={z}>
                📍 {z} ({materials.filter((m) => m.zone === z).length})
              </option>
            ))}
            {materials.some((m) => !m.zone.trim()) && (
              <option value="__unassigned__">⚠️ 未分配区块 ({materials.filter((m) => !m.zone.trim()).length})</option>
            )}
          </select>

          {/* 分类筛选下拉 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-md border border-[#e3ded2] bg-[#f8f7f2] text-[#1e2c22] focus:outline-none focus:border-[#27563c]"
          >
            <option value="all">🗂️ 全部分类 ({existingCategories.length})</option>
            {existingCategories.map((c) => (
              <option key={c} value={c}>
                {c} ({materials.filter((m) => m.category === c).length})
              </option>
            ))}
          </select>

          {/* 库存状态胶囊 */}
          <div className="inline-flex rounded-md border border-[#e3ded2] p-0.5 bg-[#f8f7f2] text-[11px] ml-auto">
            <button
              onClick={() => setSelectedStockStatus('all')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                selectedStockStatus === 'all' ? 'bg-white text-[#27563c] shadow-xs' : 'text-[#5d6e62]'
              }`}
            >
              全部 ({materials.length})
            </button>
            <button
              onClick={() => setSelectedStockStatus('normal')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                selectedStockStatus === 'normal' ? 'bg-white text-emerald-700 shadow-xs' : 'text-[#5d6e62]'
              }`}
            >
              充足
            </button>
            <button
              onClick={() => setSelectedStockStatus('low')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                selectedStockStatus === 'low' ? 'bg-white text-amber-700 shadow-xs' : 'text-[#5d6e62]'
              }`}
            >
              库存紧张
            </button>
            <button
              onClick={() => setSelectedStockStatus('empty')}
              className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                selectedStockStatus === 'empty' ? 'bg-white text-red-700 shadow-xs' : 'text-[#5d6e62]'
              }`}
            >
              缺货
            </button>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>当前为访客只读模式。管理员登录后可直接输入修改所在区块、增减库存或录入新物料。</span>
          </div>
        </div>
      )}

      {/* 物资列表区 */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#5d6e62] space-y-2">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#27563c]" />
          <p>正在读取研学仓库物资明细…</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-dashed border-[#e3ded2] text-center space-y-3 max-w-lg mx-auto p-8 shadow-xs">
          <Warehouse className="w-10 h-10 mx-auto text-[#8b998e]" />
          <div>
            <p className="text-base font-bold text-[#1e2c22]">
              {materials.length === 0 ? '研学仓库尚无物资明细' : '没有找到符合当前筛选条件的物资'}
            </p>
            <p className="text-xs text-[#5d6e62] mt-1 leading-relaxed">
              {materials.length === 0
                ? '您可以点击下方按钮一键导入常见江南农耕物资包，或手动录入基地现有物资与存放区块。'
                : '请尝试重置筛选条件或输入其他关键词搜索。'}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {materials.length === 0 && (
                <button
                  onClick={handleSeedPresets}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-xs border border-amber-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>一键导入常用农耕物料推荐包</span>
                </button>
              )}
              <button
                onClick={() => handleOpenAddModal()}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#27563c] text-white hover:bg-[#1f4530] transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>录入首条物资</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 物资明细卡片与分组呈现 */
        <div className="space-y-6">
          {groupedByZone.map(([zoneName, itemsInZone]) => (
            <section
              key={zoneName}
              className="bg-white rounded-2xl border border-[#e3ded2] shadow-xs overflow-hidden transition-all hover:border-[#27563c]/40"
            >
              {/* 区块分组头部 */}
              <header className="p-3.5 sm:p-4 bg-[#fbfaf7] border-b border-[#e3ded2] flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27563c]" />
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#27563c]" />
                    <h2 className="text-sm sm:text-base font-extrabold text-[#1e2c22]">{zoneName}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#edf5ef] text-[#27563c] font-semibold">
                      {itemsInZone.length} 项物资
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <button
                    onClick={() => handleOpenAddModal(zoneName === '未分配区块' ? '' : zoneName)}
                    className="text-xs text-[#27563c] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>在此区块新增物资</span>
                  </button>
                )}
              </header>

              {/* 区块下物资列表表格/网格 */}
              <div className="divide-y divide-[#f1eee5]">
                {itemsInZone.map((item) => {
                  const isLow = item.safeQuantity > 0 && item.quantity <= item.safeQuantity;
                  const isEmpty = item.quantity === 0;
                  const isEditingThisZone = inlineEditingZoneId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-[#faf9f5] transition-colors"
                    >
                      {/* 左侧：名称、分类、规格 */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-[#1e2c22] truncate">{item.name}</h3>

                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#f4f2ea] text-[#5d6e62] border border-[#e3ded2]">
                            {item.category}
                          </span>

                          {isEmpty ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold border border-red-200">
                              缺货 (0 {item.unit})
                            </span>
                          ) : isLow ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              库存紧张 (低于预警值 {item.safeQuantity} {item.unit})
                            </span>
                          ) : null}
                        </div>

                        {/* 规格型号与备注 */}
                        <div className="flex items-center gap-3 text-xs text-[#5d6e62] flex-wrap">
                          {item.specification && (
                            <span className="text-xs text-[#5d6e62]">规格: {item.specification}</span>
                          )}
                          {item.note && (
                            <span className="text-xs text-[#8b998e] flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              <span>{item.note}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 中间核心：物资所在区块（高亮 + 支持直接就地输入编辑！） */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-[#8b998e]">所在区块:</span>

                        {isEditingThisZone ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="text"
                              value={inlineZoneValue}
                              placeholder="输入存放区块，如 西门隔壁仓库"
                              disabled={savingZoneId === item.id}
                              onChange={(e) => setInlineZoneValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSaveInlineZone(item);
                                if (e.key === 'Escape') setInlineEditingZoneId(null);
                              }}
                              className="text-xs px-2 py-1 rounded border border-[#27563c] bg-white w-44 focus:outline-none shadow-xs"
                            />
                            <button
                              disabled={savingZoneId === item.id}
                              onClick={() => void handleSaveInlineZone(item)}
                              className="p-1 rounded bg-[#27563c] text-white hover:bg-[#1f4530]"
                              title="确认保存区块"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInlineEditingZoneId(null)}
                              className="p-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleStartInlineEditZone(item)}
                            title={canEdit ? '点击可直接就地输入修改所在区块' : '所在区块'}
                            className={`group inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              item.zone.trim()
                                ? 'bg-[#edf5ef] text-[#27563c] border-[#c9e3d2] hover:border-[#27563c]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                            }`}
                          >
                            <MapPin className="w-3 h-3 text-[#27563c]" />
                            <span className="font-semibold">{item.zone.trim() || '未指定区块 (点击录入)'}</span>
                            {canEdit && (
                              <Edit2 className="w-2.5 h-2.5 text-[#8b998e] opacity-60 group-hover:opacity-100 ml-0.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* 右侧：库存数量与加减微调 + 操作按钮 */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 justify-between lg:justify-end">
                        {/* 库存展示与微调 */}
                        <div className="flex items-center gap-1.5 bg-[#f8f7f2] p-1 rounded-lg border border-[#e3ded2]">
                          {canEdit && (
                            <button
                              disabled={item.quantity <= 0}
                              onClick={() => void handleQuickAdjustQty(item, -1)}
                              className="w-6 h-6 rounded bg-white hover:bg-stone-100 border border-[#e3ded2] text-[#1e2c22] font-bold text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                              title="库存减 1"
                            >
                              -
                            </button>
                          )}

                          <span className="px-2 text-xs font-extrabold text-[#1e2c22] min-w-16 text-center">
                            {item.quantity} <small className="font-normal text-[#5d6e62]">{item.unit}</small>
                          </span>

                          {canEdit && (
                            <button
                              onClick={() => void handleQuickAdjustQty(item, 1)}
                              className="w-6 h-6 rounded bg-white hover:bg-stone-100 border border-[#e3ded2] text-[#1e2c22] font-bold text-xs flex items-center justify-center shadow-xs"
                              title="库存加 1"
                            >
                              +
                            </button>
                          )}
                        </div>

                        {/* 编辑与删除按钮 */}
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg border border-[#e3ded2] bg-white hover:bg-stone-50 text-[#5d6e62] transition-colors"
                              title="编辑完整详情"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => void handleDeleteMaterial(item)}
                              className="p-1.5 rounded-lg border border-[#e3ded2] bg-white hover:bg-red-50 text-red-600 transition-colors"
                              title="删除物资"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 录入新物资 / 编辑物资 Modal 弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#e3ded2] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* 弹窗头部 */}
            <div className="p-5 border-b border-[#e3ded2] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-extrabold text-[#1e2c22]">
                  {editingItem ? '编辑仓库物资详情' : '录入新物资到研学仓库'}
                </h3>
                <p className="text-xs text-[#5d6e62] mt-0.5">
                  登记实物道具与耗材资产，指明存放区块与安全预警库存
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8b998e] hover:text-[#1e2c22] hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="p-5 space-y-4 text-xs">
              {/* 物资名称 */}
              <div>
                <label className="block font-bold text-[#1e2c22] mb-1">
                  物资名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：手工编织草帽、植物拓印小木槌、小石磨"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                />
              </div>

              {/* 物资所在区块 (核心输入字段，强化视觉与快速点选) */}
              <div className="p-3.5 rounded-xl bg-[#f8f7f2] border border-[#e3ded2] space-y-2">
                <label className="block font-bold text-[#27563c] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>物资所在区块 (位置分区)</span>
                  <span className="text-[11px] font-normal text-[#5d6e62] ml-1">
                    （后勤带班查找与备货的关键依据）
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="请输入物资所在区块，如：西门隔壁仓库、摩天轮仓库、稻田餐厅仓库、小森林营地仓库"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-white focus:outline-none focus:border-[#27563c] font-semibold text-[#1e2c22]"
                />

                {/* 常用区块快捷填入标签 */}
                <div>
                  <span className="text-[11px] text-[#8b998e] block mb-1.5">点击快速选用园区仓库：</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([...COMMON_ZONES, ...existingZones])).map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setFormData({ ...formData, zone: z })}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 ${
                          formData.zone === z
                            ? 'bg-[#27563c] text-white border-[#27563c] shadow-xs'
                            : 'bg-white text-[#1e2c22] border-[#d8d3c5] hover:border-[#27563c] hover:bg-[#edf5ef]'
                        }`}
                      >
                        <MapPin className={`w-3.5 h-3.5 ${formData.zone === z ? 'text-white' : 'text-[#27563c]'}`} />
                        <span>{z}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 物资分类与单位 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1e2c22] mb-1">物资分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1e2c22] mb-1">计量单位</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="件/把/套"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {COMMON_UNITS.slice(0, 6).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({ ...formData, unit: u })}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-[#e3ded2] text-[#5d6e62]"
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 库存数量与安全库存 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1e2c22] mb-1">现有库存数量</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c] font-bold text-[#27563c]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1e2c22] mb-1">安全库存预警线</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.safeQuantity}
                    onChange={(e) => setFormData({ ...formData, safeQuantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                  />
                  <span className="text-[10px] text-[#8b998e]">低于此数值时系统标记为库存紧张</span>
                </div>
              </div>

              {/* 规格型号与材质说明 */}
              <div>
                <label className="block font-bold text-[#1e2c22] mb-1">规格型号 / 材质说明</label>
                <input
                  type="text"
                  placeholder="如：加厚耐磨、天然竹编 直径30cm、儿童款带防风绳"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                />
              </div>

              {/* 存放具体位置与备注 */}
              <div>
                <label className="block font-bold text-[#1e2c22] mb-1">货架层级 / 详细存放备注</label>
                <textarea
                  rows={2}
                  placeholder="如：靠南窗第三排置物架最下层、进门右手边02号塑料收纳箱..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#e3ded2] bg-[#f8f7f2] focus:bg-white focus:outline-none focus:border-[#27563c]"
                />
              </div>
            </div>

            {/* 弹窗底部操作按钮 */}
            <div className="p-5 border-t border-[#e3ded2] flex items-center justify-between gap-3 bg-[#fbfaf7]">
              <div>
                {!editingItem && (
                  <button
                    type="button"
                    disabled={formSubmitting}
                    onClick={() => void handleSaveForm(true)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#27563c] text-[#27563c] hover:bg-[#edf5ef] font-semibold transition-colors disabled:opacity-50"
                  >
                    保存并继续添加
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs px-4 py-2 rounded-xl border border-[#e3ded2] bg-white text-[#5d6e62] hover:bg-stone-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => void handleSaveForm(false)}
                  className="text-xs font-bold px-5 py-2 rounded-xl bg-[#27563c] hover:bg-[#1f4530] text-white transition-all shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? '正在保存…' : editingItem ? '更新物资' : '确认入库'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
