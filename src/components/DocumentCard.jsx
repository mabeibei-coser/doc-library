import { Box, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

/**
 * 文档行（紧凑列表样式，仿网盘）：左图标 / 右两行——第一行只放标题，
 * 第二行放标签：子类 · 档位（免费/VIP）· 查看人数。
 * 整行可点 → 打开预览（onOpen）。下载动作移到预览界面，列表行不再带按钮。
 */
export default function DocumentCard({ doc, onOpen }) {
  const vipDoc = doc.requiredTier === 'vip';
  // 图标容器配色：VIP 金调 / 免费绿调
  const icon = vipDoc ? { bg: 'var(--gold-soft)', fg: 'var(--gold)' } : { bg: 'var(--success-soft)', fg: 'var(--success)' };

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
      {/* 图标 */}
      <Box
        sx={{
          width: { xs: 42, sm: 46 }, height: { xs: 42, sm: 46 },
          borderRadius: '12px', bgcolor: icon.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <DescriptionOutlinedIcon sx={{ color: icon.fg, fontSize: { xs: 21, sm: 24 } }} />
      </Box>

      {/* 内容区：第一行标题，第二行标签 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          noWrap
          sx={{ fontWeight: 600, color: 'var(--ink)', fontSize: { xs: '0.92rem', sm: '0.98rem' }, lineHeight: 1.35 }}
        >
          {doc.title}
        </Typography>

        {/* 标签：子类 · 档位 · 查看人数 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mt: 0.5, color: 'var(--ink-3)', fontSize: '0.76rem' }}>
          {doc.subcategory && (
            <Typography component="span" sx={{ fontSize: 'inherit', color: 'var(--ink-2)' }}>{doc.subcategory}</Typography>
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
