'use client';

import React, { useState, useEffect } from 'react';
import { canUploadActivityPhotos } from '@/lib/calendar-auth';
import { compressImageToWebpDataUrl } from '@/lib/image-compress';
import { 
  X, 
  MessageSquare, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Star, 
  Trash2, 
  Upload, 
  Maximize2, 
  Users, 
  ShieldCheck, 
  Clock, 
  Send,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';

export interface ActivityReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    name?: string;
    title?: string;
    date: string;
    place?: string;
    people?: number;
  } | null;
  currentUser?: {
    email: string;
    displayName?: string;
    name?: string;
  } | null;
  initialTab?: 'review' | 'discussion' | 'photos';
  onSaved?: () => void;
}

export function ActivityReviewDrawer({
  isOpen,
  onClose,
  event,
  currentUser,
  initialTab = 'review',
  onSaved,
}: ActivityReviewDrawerProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'discussion' | 'photos'>(initialTab);
  
  // 复盘表单状态
  const [actualParticipants, setActualParticipants] = useState<number | ''>('');
  const [overallRating, setOverallRating] = useState<number>(5);
  const [highlights, setHighlights] = useState('');
  const [issues, setIssues] = useState('');
  const [optimizations, setOptimizations] = useState('');
  const [actionStatus, setActionStatus] = useState<'open' | 'in_progress' | 'resolved'>('open');

  // 讨论评论状态
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentCategory, setCommentCategory] = useState<'optimization' | 'issue' | 'highlight'>('optimization');
  const [submittingComment, setSubmittingComment] = useState(false);

  // 照片状态
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; caption: string } | null>(null);

  // 加载与保存
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  const eventTitle = event?.name || event?.title || '未命名研学活动';
  const isAdmin = canUploadActivityPhotos(currentUser?.email);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !event?.id) return;
    setLoading(true);
    fetch(`/api/calendar/reviews?eventId=${encodeURIComponent(event.id)}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data.review) {
          setActualParticipants(
            data.review.actual_participants !== null && data.review.actual_participants !== undefined
              ? data.review.actual_participants
              : ''
          );
          setOverallRating(data.review.overall_rating ?? 5);
          setHighlights(data.review.highlights ?? '');
          setIssues(data.review.issues ?? '');
          setOptimizations(data.review.optimizations ?? '');
          setActionStatus(data.review.action_status ?? 'open');
        } else {
          // 首次复盘：默认带入活动的计划人数
          setActualParticipants(event.people ? event.people : '');
          setOverallRating(5);
          setHighlights('');
          setIssues('');
          setOptimizations('');
          setActionStatus('open');
        }
        setComments(data.comments ?? []);
        setPhotos(data.photos ?? []);
      })
      .catch((err) => {
        console.error('加载复盘数据异常:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, event?.id, event?.people]);

  if (!isOpen || !event) return null;

  // 保存复盘
  const handleSaveReview = async () => {
    if (!currentUser?.email) {
      alert('请先登录账号后再保存复盘');
      return;
    }
    setSaving(true);
    setSaveToast('');
    try {
      const res = await fetch('/api/calendar/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_review',
          eventId: event.id,
          eventTitle,
          eventDate: event.date,
          actualParticipants: actualParticipants === '' ? null : Number(actualParticipants),
          overallRating,
          highlights,
          issues,
          optimizations,
          actionStatus,
          userEmail: currentUser.email,
          userName: currentUser.displayName || currentUser.name || currentUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setSaveToast('✓ 活动执行复盘保存成功！');
      setTimeout(() => setSaveToast(''), 3000);
      onSaved?.();
    } catch (err: any) {
      alert(err.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 发表讨论
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (!currentUser?.email) {
      alert('请先登录账号后再发表讨论');
      return;
    }
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/calendar/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          eventId: event.id,
          content: newComment.trim(),
          category: commentCategory,
          userEmail: currentUser.email,
          userName: currentUser.displayName || currentUser.name || currentUser.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '评论发表失败');
      setNewComment('');
      // 重新拉取
      const detailRes = await fetch(`/api/calendar/reviews?eventId=${encodeURIComponent(event.id)}`);
      const detailData = await detailRes.json();
      setComments(detailData.comments ?? []);
    } catch (err: any) {
      alert(err.message || '发布讨论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 上传照片（仅管理员权限）
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!isAdmin) {
      alert('权限不足：仅主管理员可以上传活动照片');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const imageUrl = await compressImageToWebpDataUrl(file);
        const res = await fetch('/api/calendar/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_photo',
            eventId: event.id,
            eventDate: event.date,
            imageUrl,
            caption: photoCaption.trim(),
            userEmail: currentUser?.email,
            userName: currentUser?.displayName || currentUser?.name || currentUser?.email,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '上传照片失败');
        }
      }
      setPhotoCaption('');
      // 重新拉取照片
      const detailRes = await fetch(`/api/calendar/reviews?eventId=${encodeURIComponent(event.id)}`);
      const detailData = await detailRes.json();
      setPhotos(detailData.photos ?? []);
      onSaved?.();
    } catch (err: any) {
      alert(err.message || '照片上传失败，请检查文件格式');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 删除照片（仅管理员权限）
  const handleDeletePhoto = async (photoId: string) => {
    if (!isAdmin) {
      alert('仅管理员可以删除照片');
      return;
    }
    if (!confirm('确认删除这张活动现场照片吗？此操作无法撤销。')) return;
    try {
      const res = await fetch('/api/calendar/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_photo',
          photoId,
          userEmail: currentUser?.email,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      onSaved?.();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200/80">
                  <Clock className="w-3 h-3 text-emerald-600" /> 东八区活动日：{event.date}
                </span>
                {event.place && (
                  <span className="text-xs text-stone-500 font-medium">
                    📍 {event.place}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-lg sm:text-xl font-bold font-serif text-stone-900 tracking-tight flex items-center gap-2">
                <span>{eventTitle}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-amber-100/70 text-amber-900 border border-amber-200">
                  执行复盘与优化
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 导航 Tab */}
          <div className="flex border-b border-stone-200 px-6 bg-white gap-2 sm:gap-6">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-1.5 border-b-2 py-3 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'review'
                  ? 'border-[#27563c] text-[#27563c]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>结构化复盘 (KPT)</span>
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={`flex items-center gap-1.5 border-b-2 py-3 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'discussion'
                  ? 'border-[#27563c] text-[#27563c]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>团队优化讨论 ({comments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex items-center gap-1.5 border-b-2 py-3 text-xs sm:text-sm font-semibold transition ${
                activeTab === 'photos'
                  ? 'border-[#27563c] text-[#27563c]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>现场照片墙 ({photos.length})</span>
            </button>
          </div>

          {/* 主体内容区 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#faf9f6]/40">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-stone-400 text-sm">
                <span>正在加载活动复盘档案…</span>
              </div>
            ) : (
              <>
                {/* 1. 复盘记录面板 (KPT 框架) */}
                {activeTab === 'review' && (
                  <div className="space-y-4">
                    {/* 基础指标 */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">实际到场人数</label>
                        <input
                          type="number"
                          value={actualParticipants}
                          onChange={(e) => setActualParticipants(e.target.value ? Number(e.target.value) : '')}
                          placeholder={event.people ? `计划 ${event.people} 人` : '例如：45'}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs focus:border-[#27563c] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">执行顺畅度评分</label>
                        <select
                          value={overallRating}
                          onChange={(e) => setOverallRating(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white focus:border-[#27563c] focus:outline-none font-medium"
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ 5分 (极度顺畅)</option>
                          <option value={4}>⭐⭐⭐⭐ 4分 (执行良好)</option>
                          <option value={3}>⭐⭐⭐ 3分 (基本达标)</option>
                          <option value={2}>⭐⭐ 2分 (存在卡点)</option>
                          <option value={1}>⭐ 1分 (重大问题)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700">优化项推进闭环</label>
                        <select
                          value={actionStatus}
                          onChange={(e) => setActionStatus(e.target.value as any)}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs bg-white focus:border-[#27563c] focus:outline-none font-medium"
                        >
                          <option value="open">🔴 待优化跟进</option>
                          <option value="in_progress">🟡 优化推进中</option>
                          <option value="resolved">🟢 已落实闭环</option>
                        </select>
                      </div>
                    </div>

                    {/* K: 亮点 */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5 shadow-xs">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>✅ 本次执行亮点与值得保持的做法 (Keep)</span>
                      </label>
                      <p className="text-[11px] text-emerald-700">
                        记录现场反响极佳、学员积极性高、导师配合默契、动线设计合理的细节亮点。
                      </p>
                      <textarea
                        rows={3}
                        value={highlights}
                        onChange={(e) => setHighlights(e.target.value)}
                        placeholder="例如：水稻收割前 10 分钟的安全操作口诀反响极好，零学员划伤；下午碾米手工环节亲子互动热烈..."
                        className="mt-1 w-full rounded-lg border border-emerald-300 bg-white p-3 text-xs leading-relaxed text-stone-800 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    {/* P: 问题 */}
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-1.5 shadow-xs">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>⚠️ 现场暴露卡点、物料损耗或时间延误 (Problem)</span>
                      </label>
                      <p className="text-[11px] text-rose-700">
                        实事求是记录实际卡点，如转场耗时超标、物料破损、恶劣天气应对不足、后勤衔接漏洞。
                      </p>
                      <textarea
                        rows={3}
                        value={issues}
                        onChange={(e) => setIssues(e.target.value)}
                        placeholder="例如：洗手池数量不足导致午餐前排队 15 分钟；部分草帽带子过松容易掉落；大巴车返程遇到晚高峰迟到 20 分钟..."
                        className="mt-1 w-full rounded-lg border border-rose-300 bg-white p-3 text-xs leading-relaxed text-stone-800 focus:border-rose-600 focus:outline-none"
                      />
                    </div>

                    {/* T: 优化措施 */}
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-1.5 shadow-xs">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                        <Lightbulb className="w-4 h-4 text-indigo-600" />
                        <span>🚀 下次活动具体优化方案与标准动作迭代 (Try / Action)</span>
                      </label>
                      <p className="text-[11px] text-indigo-700">
                        将教训转化为团队可落地的行动项（SOP 调整、物资采购变更、人员责任认领）。
                      </p>
                      <textarea
                        rows={3}
                        value={optimizations}
                        onChange={(e) => setOptimizations(e.target.value)}
                        placeholder="例如：1. 下次出团前新增 2 个便携移动水龙头；2. 物资采购更新为系带加固款草帽；3. 返程时间统一提前至 15:30 避开拥堵..."
                        className="mt-1 w-full rounded-lg border border-indigo-300 bg-white p-3 text-xs leading-relaxed text-stone-800 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    {saveToast && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{saveToast}</span>
                      </div>
                    )}

                    <button
                      onClick={handleSaveReview}
                      disabled={saving}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#27563c] hover:bg-[#1e4530] text-white py-3 text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
                    >
                      {saving ? '正在保存复盘档案…' : '保存活动执行复盘'}
                    </button>
                  </div>
                )}

                {/* 2. 团队优化讨论流 */}
                {activeTab === 'discussion' && (
                  <div className="space-y-4">
                    {/* 发帖输入框 */}
                    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-700">发言类别：</span>
                          <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
                            <button
                              type="button"
                              onClick={() => setCommentCategory('optimization')}
                              className={`px-2 py-1 rounded font-medium transition ${
                                commentCategory === 'optimization'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-stone-600'
                              }`}
                            >
                              💡 提优化点
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentCategory('issue')}
                              className={`px-2 py-1 rounded font-medium transition ${
                                commentCategory === 'issue'
                                  ? 'bg-white text-rose-700 shadow-xs'
                                  : 'text-stone-600'
                              }`}
                            >
                              🔍 补充现场问题
                            </button>
                            <button
                              type="button"
                              onClick={() => setCommentCategory('highlight')}
                              className={`px-2 py-1 rounded font-medium transition ${
                                commentCategory === 'highlight'
                                  ? 'bg-white text-emerald-700 shadow-xs'
                                  : 'text-stone-600'
                              }`}
                            >
                              👏 点赞亮点
                            </button>
                          </div>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          全员可见 · 共同进步
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="写下你对本场活动的实操观察、现场反馈或优化金点子…"
                        className="w-full rounded-lg border border-stone-200 p-3 text-xs leading-relaxed text-stone-800 focus:border-[#27563c] focus:outline-none"
                      />

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-stone-500">
                          当前登录：<strong className="text-stone-700">{currentUser?.email || '未登录访客'}</strong>
                        </span>
                        <button
                          onClick={handleAddComment}
                          disabled={submittingComment || !newComment.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{submittingComment ? '发布中…' : '发布讨论'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 评论列表 */}
                    <div className="space-y-3 pt-1">
                      {comments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stone-200 bg-white py-12 text-center text-xs text-stone-400">
                          暂无团队讨论，欢迎发表第一条复盘反思或现场改进建议！
                        </div>
                      ) : (
                        comments.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-2 hover:border-stone-300 transition"
                          >
                            <div className="flex items-center justify-between text-xs text-stone-500">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-[#27563c]/10 text-[#27563c] flex items-center justify-center font-bold text-[10px]">
                                  {c.author_name?.slice(0, 1) || '友'}
                                </div>
                                <span className="font-semibold text-stone-800">
                                  {c.author_name}
                                </span>
                                {c.author_role === 'admin' ? (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200/80">
                                    管理员
                                  </span>
                                ) : (
                                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                                    团队成员
                                  </span>
                                )}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    c.category === 'highlight'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : c.category === 'issue'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-indigo-50 text-indigo-700'
                                  }`}
                                >
                                  {c.category === 'highlight'
                                    ? '👏 亮点'
                                    : c.category === 'issue'
                                    ? '🔍 问题'
                                    : '💡 优化'}
                                </span>
                              </div>
                              <span className="text-[11px] text-stone-400">
                                {new Date(c.created_at).toLocaleString('zh-CN', {
                                  timeZone: 'Asia/Shanghai',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-xs sm:text-sm text-stone-700 leading-relaxed pl-8">
                              {c.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. 活动现场照片墙（仅管理员可上传） */}
                {activeTab === 'photos' && (
                  <div className="space-y-4">
                    {/* 管理员专属上传面板 */}
                    {isAdmin ? (
                      <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            <span>📷 上传本场活动现场照片（管理员专属权限）</span>
                          </div>
                          <span className="text-[11px] font-medium text-indigo-700">
                            自动无损压缩 WebP
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                          支持一次性多选上传（如昨天的活动抓拍）。系统会在浏览器本地快速压缩至轻量高清规格，秒级存入档案。
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={photoCaption}
                            onChange={(e) => setPhotoCaption(e.target.value)}
                            placeholder="可选：输入照片批次说明（如：下午庇护所搭建实操现场）"
                            className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
                          />
                          <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploading ? '压缩并上传中…' : '选择现场照片'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={uploading}
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-stone-200 bg-white p-3.5 text-xs text-stone-600 flex items-center gap-2">
                        <span className="text-base">🔒</span>
                        <span>
                          现场活动照片由主管理员统一上传归档。团队成员可在线浏览或点击大图查看。
                        </span>
                      </div>
                    )}

                    {/* 照片展示网格 */}
                    {photos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-200 bg-white py-16 text-center text-xs text-stone-400 space-y-2">
                        <Camera className="w-8 h-8 text-stone-300 mx-auto" />
                        <p>本场活动暂未归档现场照片。</p>
                        {isAdmin && (
                          <p className="text-[11px] text-indigo-600">
                            您可以点击上方“选择现场照片”按钮上传。
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs transition hover:shadow-md"
                          >
                            <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-100 cursor-pointer"
                              onClick={() => setPreviewImage({ url: photo.image_url, caption: photo.caption || eventTitle })}
                            >
                              <img
                                src={photo.image_url}
                                alt={photo.caption || '活动现场照片'}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                <Maximize2 className="w-5 h-5 drop-shadow" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-2 text-xs text-stone-600 bg-white">
                              <span className="truncate text-[11px] font-medium" title={photo.caption}>
                                {photo.caption || '活动精彩瞬间'}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeletePhoto(photo.id);
                                  }}
                                  className="text-stone-400 hover:text-rose-600 p-1 rounded transition"
                                  title="删除此照片"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 照片全屏大图预览 Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1 font-semibold"
            >
              <X className="w-5 h-5" /> 关闭
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.caption}
              className="max-h-[80vh] w-auto rounded-lg shadow-2xl object-contain"
            />
            {previewImage.caption && (
              <p className="mt-3 text-sm text-stone-200 font-medium tracking-wide">
                {previewImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
