import { Box, Typography } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { fileTypeMeta } from '../utils/fileType';

/**
 * 文档行（紧凑列表样式，仿网盘）：左图标 / 右两行——第一行只放标题，
 * 第二行放标签：子类 · 档位（免费/VIP）· 查看人数。
 * 整行可点 → 打开预览（onOpen）。下载动作移到预览界面，列表行不再带按钮。
 */
export default function DocumentCard({ doc, onOpen }) {
  const vipDoc = doc.requiredTier === 'vip';
  // 图标按文件类型区分（Word/Excel/PPT/PDF/图片/视频/其它），各带专属图标与配色；
  // 免费/VIP 档位改由下方文字标签表达，不再压在图标上。
  // 解构出 Icon 后用大写命名渲染——MUI 的 icon 是 memo 包装组件，
  // 直接写 `<ft.Icon>` 在 Vite automatic JSX runtime 下渲染时报错（具体原因迷），先解构规避。
  const ft = fileTypeMeta(doc.attachmentMime, doc.attachmentName);
  const FileIcon = ft.Icon;

  return (
    <Box
      onClick={() => onOpen?.(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(doc); } }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 1.75 },
        px: { xs: 1.75, sm: 2.25 },
        py: { xs: 1.5, sm: 1.75 },
        cursor: 'pointer',
        outline: 'none',
        transition: 'background-color .18s',
        '&:hover': { bgcolor: 'var(--bg-mute)' },
        '&:focus-visible': { bgcolor: 'var(--bg-mute)' },
      }}
    >
      {/* 图标：按文件类型上色 */}
      <Box
        sx={{
          width: { xs: 42, sm: 46 }, height: { xs: 42, sm: 46 },
          borderRadius: '12px', bgcolor: ft.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <FileIcon titleAccess={ft.label} sx={{ color: ft.fg, fontSize: { xs: 21, sm: 24 } }} />
      </Box>

      {/* 内容区：第一行标题，第二行标签 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 600, color: 'var(--ink)', fontSize: { xs: '0.92rem', sm: '0.98rem' }, lineHeight: 1.35 }}
        >
          {doc.title}
        </Typography>

        {/* 标签：子类（小 chip）· 档位 · 查看次数 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.6, color: 'var(--ink-3)', fontSize: '0.76rem' }}>
          {doc.subcategory && (
            <Typography
              component="span"
              sx={{
                display: 'inline-block',
                px: 0.75, py: 0.15,
                borderRadius: 'var(--r-xs)',
                bgcolor: 'var(--accent-soft)',
                color: 'var(--accent-ink)',
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1.5,
                letterSpacing: '0.01em',
              }}
            >
              {doc.subcategory}
            </Typography>
          )}
          {/* 档位 */}
          {vipDoc ? (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: 'var(--gold-ink)' }}>
              <WorkspacePremiumIcon sx={{ fontSize: 13 }} />
              <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700 }}>VIP</Typography>
            </Box>
          ) : (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, color: 'var(--success)' }}>
              <TaskAltRoundedIcon sx={{ fontSize: 13 }} />
              <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700 }}>免费</Typography>
            </Box>
          )}
          {/* 查看人数 */}
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
            <VisibilityOutlinedIcon sx={{ fontSize: 13 }} />
            <Typography component="span" sx={{ fontSize: 'inherit' }}>{doc.viewCount ?? 0}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
