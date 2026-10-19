import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { parseReviewContent } from '@/lib/review-parser';

export const runtime = 'nodejs';

/**
 * 接收 Word 文档 (.docx) 或文本，自动识别并提取研学复盘各字段
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rawText = '';
    let planParticipants: number | undefined;

    // 1. 处理 multipart/form-data 文件上传
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const participantsStr = formData.get('planParticipants') as string | null;
      if (participantsStr) {
        const p = parseInt(participantsStr, 10);
        if (!isNaN(p)) planParticipants = p;
      }

      if (!file) {
        return NextResponse.json({ error: '请上传有效的复盘文档' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.endsWith('.docx')) {
        // 使用 mammoth 解析 docx
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || '';
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        // 纯文本文件
        rawText = buffer.toString('utf-8');
      } else {
        // 尝试作为文本或 mammoth 处理
        try {
          const result = await mammoth.extractRawText({ buffer });
          rawText = result.value || '';
        } catch {
          rawText = buffer.toString('utf-8');
        }
      }
    } else {
      // 2. 处理直接传入的 JSON 文本
      const body = await req.json();
      rawText = body.text || '';
      if (typeof body.planParticipants === 'number') {
        planParticipants = body.planParticipants;
      }
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: '未能从文档或输入中提取到任何有效文本，请检查文件是否为空' },
        { status: 400 }
      );
    }

    // 3. 执行智能抽取引擎
    const parsed = parseReviewContent(rawText, planParticipants);

    return NextResponse.json({
      success: true,
      rawText,
      parsed,
    });
  } catch (error: any) {
    console.error('复盘文档解析失败:', error);
    return NextResponse.json(
      { error: error?.message || '文档解析处理失败，请稍后重试' },
      { status: 500 }
    );
  }
}
