/**
 * 文档类型识别 + 图标/配色映射。列表卡片与预览弹窗共用，避免两处分别判类型走偏。
 * 判定优先看 MIME，缺失时回退文件名后缀。返回的 kind 同时决定：
 *   - 列表/预览左侧图标的样式（图标 + 描边色 + 软底色）
 *   - 预览弹窗能否内嵌渲染（image/pdf/video 可内嵌，office/other 走占位）
 */
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'

/**
 * mime + 文件名 → 类型 kind。office 系列拆成 word/excel/ppt，其余归 image/video/pdf/other。
 * 先认文件名后缀、再回退 mime——因为后台上传存的 mime 不可靠（实测 .xlsx/.docx 都被写成
 * application/pdf），后缀是更可信的信号；只有后缀缺失/不认识时才看 mime。
 */
export function getFileType(mime, name) {
  const ext = ((name || '').split('.').pop() || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'
  if (['ppt', 'pptx'].includes(ext)) return 'ppt'
  if (['doc', 'docx', 'rtf'].includes(ext)) return 'word'
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive'
  // 后缀不认识时再看 mime
  const m = (mime || '').toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m === 'application/pdf') return 'pdf'
  if (m.includes('spreadsheet') || m.includes('ms-excel')) return 'excel'
  if (m.includes('presentation') || m.includes('powerpoint')) return 'ppt'
  if (m.includes('word') || m.includes('wordprocessing')) return 'word'
  if (m.includes('zip') || m.includes('rar') || m.includes('compressed') || m.includes('7z')) return 'archive'
  return 'other'
}

/** 各 kind 的图标与配色。色调统一压暗以贴合绿/金克制的设计语言。 */
export const FILE_TYPE_META = {
  word: { Icon: ArticleOutlinedIcon, fg: '#2f6db0', bg: '#e9f1fb', label: 'Word' },
  excel: { Icon: TableChartOutlinedIcon, fg: '#1f8a52', bg: '#e6f4ec', label: 'Excel' },
  ppt: { Icon: SlideshowOutlinedIcon, fg: '#c0612a', bg: '#fbeede', label: 'PPT' },
  pdf: { Icon: PictureAsPdfOutlinedIcon, fg: '#c5392b', bg: '#fbe7e2', label: 'PDF' },
  image: { Icon: ImageOutlinedIcon, fg: '#7a5bbd', bg: '#efeafb', label: '图片' },
  video: { Icon: MovieOutlinedIcon, fg: '#b5357e', bg: '#fbe8f2', label: '视频' },
  archive: { Icon: ArchiveOutlinedIcon, fg: '#7a5a1f', bg: '#f7eddc', label: '压缩包' },
  other: { Icon: InsertDriveFileOutlinedIcon, fg: '#64748b', bg: '#eef1f5', label: '文件' },
}

/** 便捷：直接由 mime + 文件名拿到该类型的图标/配色元信息。 */
export const fileTypeMeta = (mime, name) => FILE_TYPE_META[getFileType(mime, name)]
