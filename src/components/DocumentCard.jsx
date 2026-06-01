import React, { useState } from 'react';
import { Card, Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import DescriptionIcon from '@mui/icons-material/Description';
import { downloadDocument, gotoCenterLogin } from '../utils/api';

/**
 * 文档行：横条布局——左图标 / 中标题+角标+说明 / 右下载按钮。
 * vip 档非会员点下载 → 后端 403 → 回调 onNeedVip 引导开通。
 */
export default function DocumentCard({ doc, isVip, onNeedVip }) {
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState(null);
  const vipDoc = doc.requiredTier === 'vip';

  const handleDownload = async () => {
    if (downloading) return;
    setErr(null);
    setDownloading(true);
    try {
      await downloadDocument(doc);
    } catch (e) {
      if (e.status === 401) { gotoCenterLogin(); return; }
      if (e.status === 403 || e.needVip) { onNeedVip?.(); return; }
      setErr(e.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        transition: 'box-shadow .2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      {/* 图标 */}
      <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <DescriptionIcon sx={{ color: '#1e3a5f', fontSize: 24 }} />
      </Box>

      {/* 内容区：标题 + 角标一行，说明一行 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', lineHeight: 1.35 }}>
            {doc.title}
          </Typography>
          {doc.category && (
            <Chip label={doc.category} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f1f5f9', color: '#475569' }} />
          )}
          <Chip
            label={vipDoc ? 'VIP 专享' : '免费'}
            size="small"
            sx={{ height: 18, fontSize: '0.65rem', bgcolor: vipDoc ? '#1e3a5f' : '#ecfdf5', color: vipDoc ? '#fff' : '#065f46', fontWeight: 700 }}
          />
        </Box>
        {doc.description && (
          <Typography variant="body2" noWrap sx={{ color: '#64748b', fontSize: '0.82rem', mt: 0.5 }}>
            {doc.description}
          </Typography>
        )}
        {err && <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', mt: 0.5 }}>{err}</Typography>}
      </Box>

      {/* 右侧下载按钮 */}
      <Button
        variant={vipDoc && !isVip ? 'outlined' : 'contained'}
        size="small"
        disabled={downloading || !doc.hasAttachment}
        startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : (vipDoc && !isVip ? <LockIcon /> : <DownloadIcon />)}
        onClick={handleDownload}
        sx={{
          flexShrink: 0,
          whiteSpace: 'nowrap',
          minWidth: { xs: 'auto', sm: 150 },
          ...(vipDoc && !isVip
            ? { color: '#1e3a5f', borderColor: '#cbd5e1' }
            : { bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#2c5282' } }),
        }}
      >
        {!doc.hasAttachment ? '暂无附件' : downloading ? '下载中...' : (vipDoc && !isVip ? '开通 VIP 下载' : '下载')}
      </Button>
    </Card>
  );
}
