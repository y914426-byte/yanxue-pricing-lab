/**
 * 江南农耕研学 · 日历全能导出中心 (Universal Export Engine)
 * 支持一键导出 Excel (.xlsx / .csv 表格)、A4 打印出团通知单与交接单
 */

import { ActivityDetail } from './calendar-ai-smart';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getWeekday(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return WEEKDAYS[d.getDay()] || '';
  } catch {
    return '';
  }
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: '已确定',
  pending: '待确认',
  booking: '预约中',
  completed: '已完成',
  cancelled: '已取消',
};

/**
 * 导出高质量的研学排期 Excel 表格 (.xls / HTML-XML 格式，原生支持格式与背景色)
 */
export function exportEventsToExcel(events: ActivityDetail[], filename = '江南农耕研学-排期日程表') {
  const headers = [
    '序号',
    '活动日期',
    '星期',
    '活动主题',
    '状态',
    '研学对象',
    '预估人数',
    '活动场地',
    '流程日程安排',
    '物资准备与待办清单',
    '行前注意事项与安全防范',
    '特别备注说明',
  ];

  let xmlRows = '';
  // 表头
  xmlRows += `<tr>${headers
    .map(
      (h) =>
        `<th style="background-color: #27563c; color: #ffffff; font-weight: bold; padding: 10px 14px; border: 1px solid #d3dec8; text-align: center; font-size: 13px;">${h}</th>`
    )
    .join('')}</tr>`;

  // 数据行
  events.forEach((e, idx) => {
    const weekday = getWeekday(e.date);
    const statusText = STATUS_LABELS[e.status || ''] || e.status || '待定';
    const flowText = (e.flow || '').replace(/\n/g, '<br/>');
    const matsText = (e.materials || [])
      .map((m) => `[${m.done ? '✓已备' : '待办'}] ${m.name} × ${m.qty}${m.note ? ' (' + m.note + ')' : ''}`)
      .join('<br/>');
    const precText = (e.precautions || '').replace(/\n/g, '<br/>');
    const noteText = (e.note || '').replace(/\n/g, '<br/>');

    const rowBg = idx % 2 === 0 ? '#ffffff' : '#fbfaf7';
    const statusBg =
      e.status === 'confirmed'
        ? '#edf5ef; color: #27563c; font-weight: bold;'
        : '#fef7ec; color: #d97706; font-weight: bold;';

    xmlRows += `<tr style="background-color: ${rowBg};">
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: center; vertical-align: top;">${idx + 1}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: center; vertical-align: top; font-weight: bold;">${e.date}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: center; vertical-align: top;">${weekday}</td>
      <td style="padding: 8px 12px; border: 1px solid #e2ddd3; vertical-align: top; font-weight: bold; color: #1e2c22;">${e.name}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: center; vertical-align: top; background-color: ${statusBg}">${statusText}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: center; vertical-align: top;">${e.audience || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; text-align: right; vertical-align: top; font-weight: bold;">${e.people || 0}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; vertical-align: top;">${e.place || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; vertical-align: top; font-size: 11px; line-height: 1.4;">${flowText || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; vertical-align: top; font-size: 11px; line-height: 1.4;">${matsText || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; vertical-align: top; font-size: 11px; color: #854d0e; line-height: 1.4;">${precText || '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #e2ddd3; vertical-align: top; font-size: 11px; color: #64748b;">${noteText || '-'}</td>
    </tr>`;
  });

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>研学排期明细表</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1" style="border-collapse: collapse; font-family: 'Microsoft YaHei', sans-serif;">
          ${xmlRows}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导出兼容性极佳的 UTF-8 with BOM CSV 表格
 */
export function exportEventsToCSV(events: ActivityDetail[], filename = '研学排期表') {
  const headers = [
    '序号',
    '活动日期',
    '星期',
    '活动名称',
    '状态',
    '研学对象',
    '人数',
    '场地',
    '流程安排',
    '物资待办',
    '注意事项',
    '备注说明',
  ];

  const escapeCSV = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCSV).join(','));

  events.forEach((e, idx) => {
    const weekday = getWeekday(e.date);
    const statusText = STATUS_LABELS[e.status || ''] || e.status || '';
    const flowText = (e.flow || '').replace(/\r?\n/g, '；');
    const matsText = (e.materials || [])
      .map((m) => `[${m.done ? '已备' : '待办'}]${m.name}×${m.qty}`)
      .join('；');
    const precText = (e.precautions || '').replace(/\r?\n/g, '；');
    const noteText = (e.note || '').replace(/\r?\n/g, '；');

    rows.push(
      [
        idx + 1,
        e.date,
        weekday,
        e.name,
        statusText,
        e.audience || '',
        e.people || 0,
        e.place || '',
        flowText,
        matsText,
        precText,
        noteText,
      ]
        .map(escapeCSV)
        .join(',')
    );
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 调起浏览器标准 A4 出团任务交接单打印
 */
export function printActivityDocument(event: ActivityDetail) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出打印窗口以导出 PDF 或打印文件。');
    return;
  }

  const statusText = STATUS_LABELS[event.status || ''] || event.status || '已确认';
  const mats = event.materials || [];
  const doneCount = mats.filter((m) => m.done).length;

  const flowLines = (event.flow || '暂无填写的日程流程')
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        `<div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 13px;">
          <span style="color: #27563c; font-weight: bold;">•</span>
          <span>${line}</span>
        </div>`
    )
    .join('');

  const matsRows = mats
    .map(
      (m, i) =>
        `<tr>
          <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: center; width: 40px;">${i + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #ccc; font-weight: bold;">${m.name}</td>
          <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: center; width: 80px;">${m.qty}</td>
          <td style="padding: 6px 8px; border: 1px solid #ccc; color: #666; font-size: 12px;">${m.note || '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: center; width: 70px; font-weight: bold; color: ${m.done ? '#27563c' : '#c2410c'};">
            ${m.done ? '☑ 已备齐' : '☐ 待准备'}
          </td>
        </tr>`
    )
    .join('');

  const precLines = (event.precautions || '请遵从导师指引，穿防滑鞋，注意田间与农具安全。')
    .split('\n')
    .filter(Boolean)
    .map((p) => `<div style="margin-bottom: 4px; font-size: 12px; line-height: 1.5;">${p}</div>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>研学出团工作单-${event.date}-${event.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; color: #1e2c22; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 2px solid #27563c; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 22px; font-weight: bold; margin-bottom: 6px; }
          .sub { font-size: 13px; color: #555; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #fbfaf7; padding: 10px; border-radius: 6px; border: 1px solid #e5e0d5; margin-bottom: 16px; font-size: 13px; }
          .section-title { font-size: 15px; font-weight: bold; color: #27563c; border-left: 4px solid #27563c; padding-left: 8px; margin: 14px 0 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
          .prec-box { background: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 16px; }
          .sign-area { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; font-size: 13px; padding-top: 16px; border-top: 1px dashed #ccc; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background: #27563c; color: white; border: none; padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer;">
            🖨️ 确认打印 / 另存为 PDF
          </button>
        </div>

        <div class="header">
          <div class="sub">江南农耕研学 · 现场营运执行工作单</div>
          <div class="title">${event.name}</div>
          <div class="sub">活动日期：${event.date} | 状态：【${statusText}】</div>
        </div>

        <div class="meta-grid">
          <div><strong>研学对象：</strong>${event.audience || '亲子/团队'}</div>
          <div><strong>标定规模：</strong>${event.people} 人</div>
          <div><strong>活动场地：</strong>${event.place || '研学文化园'}</div>
          <div><strong>物资备货：</strong>${doneCount} / ${mats.length} 项</div>
        </div>

        <div class="section-title">⏰ 活动时间节点与日程动线</div>
        <div style="background: #fbfaf7; border: 1px solid #e5e0d5; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px;">
          ${flowLines}
        </div>

        <div class="section-title">📦 物资准备与交接清单</div>
        <table>
          <thead>
            <tr style="background: #f1eee5;">
              <th style="padding: 6px 8px; border: 1px solid #ccc; width: 40px;">序号</th>
              <th style="padding: 6px 8px; border: 1px solid #ccc;">物资名称</th>
              <th style="padding: 6px 8px; border: 1px solid #ccc; width: 80px;">配备数量</th>
              <th style="padding: 6px 8px; border: 1px solid #ccc;">特别备注要求</th>
              <th style="padding: 6px 8px; border: 1px solid #ccc; width: 70px;">清点状态</th>
            </tr>
          </thead>
          <tbody>
            ${matsRows || '<tr><td colspan="5" style="text-align:center; padding: 10px;">暂未列出具体物资</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">⚠️ 行前注意事项与安全风控宣导</div>
        <div class="prec-box">
          ${precLines}
        </div>

        ${
          event.note
            ? `
          <div class="section-title">📝 基地与特别备注</div>
          <div style="background: #f8f9fa; border: 1px solid #e9ecef; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 16px;">
            ${event.note}
          </div>
        `
            : ''
        }

        <div class="sign-area">
          <div>带班主导师签字：_______________</div>
          <div>物资保障交接人：_______________</div>
          <div>基地安全员签字：_______________</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
