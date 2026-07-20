// PDF 배경 위에서 파워포인트처럼 컴포넌트를 배치·편집.
//  - 상단 팔레트에서 유형 선택 → 캔버스에 드래그로 그려 넣기(크기 지정) 또는 클릭 배치(표 셀 자동 스냅)
//  - 각 필드는 실제 컨트롤 모양(WYSIWYG)으로 표시, 드래그 이동 + 모서리 크기 조절(react-rnd)
//  - 커서(선택) 모드에서 빈 곳 드래그 = 영역 선택, Ctrl+클릭 = 다중 선택
import { useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import NotesIcon from '@mui/icons-material/Notes';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowDropDownCircleOutlinedIcon from '@mui/icons-material/ArrowDropDownCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import AlignHorizontalLeftIcon from '@mui/icons-material/AlignHorizontalLeft';
import AlignHorizontalCenterIcon from '@mui/icons-material/AlignHorizontalCenter';
import AlignHorizontalRightIcon from '@mui/icons-material/AlignHorizontalRight';
import AlignVerticalTopIcon from '@mui/icons-material/AlignVerticalTop';
import AlignVerticalCenterIcon from '@mui/icons-material/AlignVerticalCenter';
import AlignVerticalBottomIcon from '@mui/icons-material/AlignVerticalBottom';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { CellRegion, FormSchema, Question, QuestionType } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { useElementSize } from '@/hooks/useElementSize';

// 팔레트: 배치 가능한 컴포넌트 유형
const PALETTE: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: '단답', icon: <TextFieldsIcon sx={{ fontSize: 16 }} /> },
  { type: 'textarea', label: '장문', icon: <NotesIcon sx={{ fontSize: 16 }} /> },
  { type: 'number', label: '숫자', icon: <NumbersIcon sx={{ fontSize: 16 }} /> },
  { type: 'date', label: '날짜', icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> },
  { type: 'boolean', label: '체크박스', icon: <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} /> },
  { type: 'select', label: '드롭다운', icon: <ArrowDropDownCircleOutlinedIcon sx={{ fontSize: 16 }} /> },
  { type: 'info', label: '안내문', icon: <InfoOutlinedIcon sx={{ fontSize: 16 }} /> },
];

const INPUT_BOX = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #90a4c4',
  borderRadius: '3px',
  bgcolor: 'rgba(255,255,255,0.92)',
  display: 'flex',
  alignItems: 'center',
  px: 0.5,
  overflow: 'hidden',
  color: 'text.secondary',
};

/** 편집기에서 컴포넌트를 실제 모양(WYSIWYG)으로 표시. 이벤트는 통과(pointerEvents none). */
function FieldPreview({ q, showLabel }: { q: Question; showLabel?: boolean }) {
  const fs = q.fontSize ?? 13;
  const label = q.label || '입력';
  const labelSize = Math.max(9, Math.min(fs, 13));

  // 체크박스/단일선택: [네모] 라벨 (가로)
  if (q.type === 'boolean' || q.type === 'radio') {
    const boxEl = (
      <Box
        sx={{
          width: 16,
          height: 16,
          flexShrink: 0,
          border: '1.5px solid #4a6fa5',
          borderRadius: q.type === 'radio' ? '50%' : '2px',
          bgcolor: 'rgba(255,255,255,0.92)',
        }}
      />
    );
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: showLabel ? 'flex-start' : 'center',
          gap: 0.5,
        }}
      >
        {boxEl}
        {showLabel && (
          <Typography sx={{ fontSize: labelSize, color: 'text.primary', lineHeight: 1.1 }} noWrap>
            {q.label || '선택'}
          </Typography>
        )}
      </Box>
    );
  }

  if (q.type === 'info') {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: fs, color: 'text.primary', lineHeight: 1.2 }}>{label}</Typography>
      </Box>
    );
  }

  // 입력 계열: (라벨) + 컨트롤(세로)
  let control: React.ReactNode;
  if (q.type === 'select' || q.type === 'checkbox') {
    control = (
      <Box sx={{ ...INPUT_BOX, justifyContent: 'space-between', fontSize: fs, flex: 1 }}>
        <span style={{ opacity: 0.7 }}>{q.options?.[0]?.label ?? '선택'}</span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </Box>
    );
  } else {
    const ph = q.type === 'date' ? 'YYYY-MM-DD' : q.type === 'number' ? '0' : q.placeholder || '입력';
    control = (
      <Box
        sx={{
          ...INPUT_BOX,
          alignItems: q.type === 'textarea' ? 'flex-start' : 'center',
          pt: q.type === 'textarea' ? 0.3 : 0,
          fontSize: fs,
          flex: 1,
        }}
      >
        <span style={{ opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden' }}>{ph}</span>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {showLabel && (
        <Typography
          sx={{ fontSize: labelSize, color: 'text.primary', fontWeight: 600, lineHeight: 1.1, mb: 0.2 }}
          noWrap
        >
          {label}
        </Typography>
      )}
      {control}
    </Box>
  );
}

interface PageProps {
  sectionId: string;
  pageIndex: number;
  image: string;
  cells?: CellRegion[];
  questions: Question[];
  placeType: QuestionType | null;
  onPlaced: () => void;
  showLabel?: boolean;
}

function findCell(cells: CellRegion[] | undefined, xPct: number, yPct: number): CellRegion | undefined {
  if (!cells) return undefined;
  let best: CellRegion | undefined;
  for (const c of cells) {
    if (xPct >= c.xPct && xPct <= c.xPct + c.wPct && yPct >= c.yPct && yPct <= c.yPct + c.hPct) {
      if (!best || c.wPct * c.hPct < best.wPct * best.hPct) best = c;
    }
  }
  return best;
}

function PageOverlay({
  sectionId,
  pageIndex,
  image,
  cells,
  questions,
  placeType,
  onPlaced,
  showLabel,
}: PageProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const {
    selectedIds,
    select,
    toggleSelect,
    setSelection,
    updateQuestionOverlay,
    removeQuestion,
    addOverlayQuestion,
  } = useEditorStore();
  const imgRef = useRef<HTMLImageElement>(null);
  // 드래그 사각형(px, 컨테이너 기준) — 선택 또는 그리기 겸용
  const [band, setBand] = useState<{ left: number; top: number; w: number; h: number } | null>(
    null,
  );

  const fields = questions.filter((q) => q.overlay && q.overlay.page === pageIndex);

  const pctToPx = (pct: number, dim: number) => (pct / 100) * dim;
  const pxToPct = (px: number, dim: number) => (dim > 0 ? (px / dim) * 100 : 0);
  const squareH = (wPct: number) => (size.height > 0 ? wPct * (size.width / size.height) : wPct);

  const defaultSize = (type: QuestionType): { w: number; h: number } => {
    switch (type) {
      case 'boolean':
      case 'radio':
        return { w: 4, h: squareH(4) };
      case 'textarea':
        return { w: 26, h: 10 };
      case 'number':
        return { w: 12, h: 4 };
      case 'date':
        return { w: 14, h: 4 };
      case 'select':
      case 'checkbox':
        return { w: 16, h: 5 };
      case 'info':
        return { w: 30, h: 5 };
      default:
        return { w: 16, h: 4 };
    }
  };

  // 클릭 배치(드래그 거의 없음): 표 셀 자동 스냅 우선, 아니면 기본 크기
  const placeAtPoint = (type: QuestionType, xPct: number, yPct: number) => {
    const cell = findCell(cells, xPct, yPct);
    if (cell && (type === 'text' || type === 'textarea' || type === 'number' || type === 'date')) {
      const padX = Math.min(0.6, cell.wPct * 0.06);
      const padY = Math.min(0.6, cell.hPct * 0.08);
      addOverlayQuestion(sectionId, type, {
        page: pageIndex,
        xPct: cell.xPct + padX,
        yPct: cell.yPct + padY,
        wPct: cell.wPct - padX * 2,
        hPct: cell.hPct - padY * 2,
      });
      return;
    }
    if (cell && (type === 'boolean' || type === 'radio')) {
      const padY = Math.min(0.6, cell.hPct * 0.08);
      const boxH = Math.min(cell.hPct - padY * 2, squareH(cell.wPct));
      const boxW = size.height > 0 ? boxH * (size.height / size.width) : cell.wPct * 0.5;
      addOverlayQuestion(sectionId, type, {
        page: pageIndex,
        xPct: cell.xPct + cell.wPct / 2 - boxW / 2,
        yPct: cell.yPct + cell.hPct / 2 - boxH / 2,
        wPct: boxW,
        hPct: boxH,
      });
      return;
    }
    const d = defaultSize(type);
    addOverlayQuestion(sectionId, type, {
      page: pageIndex,
      xPct: Math.max(0, Math.min(100 - d.w, xPct - d.w / 2)),
      yPct: Math.max(0, Math.min(100 - d.h, yPct - d.h / 2)),
      wPct: d.w,
      hPct: d.h,
    });
  };

  // 드래그로 그려 넣기: 그린 사각형 크기로 배치
  const placeAtRect = (type: QuestionType, bx: number, by: number, bw: number, bh: number) => {
    const W = size.width || 1;
    const H = size.height || 1;
    addOverlayQuestion(sectionId, type, {
      page: pageIndex,
      xPct: pxToPct(bx, W),
      yPct: pxToPct(by, H),
      wPct: Math.max(2, pxToPct(bw, W)),
      hPct: Math.max(2, pxToPct(bh, H)),
    });
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.target !== imgRef.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const move = (ev: MouseEvent) => {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      setBand({
        left: Math.min(start.x, x),
        top: Math.min(start.y, y),
        w: Math.abs(x - start.x),
        h: Math.abs(y - start.y),
      });
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setBand(null);
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const bx = Math.min(start.x, x);
      const by = Math.min(start.y, y);
      const bw = Math.abs(x - start.x);
      const bh = Math.abs(y - start.y);
      const isClick = bw < 5 && bh < 5;

      if (placeType) {
        if (isClick) {
          placeAtPoint(placeType, pxToPct(start.x, rect.width), pxToPct(start.y, rect.height));
        } else {
          placeAtRect(placeType, bx, by, bw, bh);
        }
        onPlaced(); // 배치 후 커서(선택) 모드로 복귀
        return;
      }

      // 커서 모드: 영역 선택
      if (isClick) {
        select(null);
        return;
      }
      const hit: string[] = [];
      for (const q of fields) {
        const ov = q.overlay!;
        const fx = (ov.xPct / 100) * rect.width;
        const fy = (ov.yPct / 100) * rect.height;
        const fw = (ov.wPct / 100) * rect.width;
        const fh = (ov.hPct / 100) * rect.height;
        if (fx < bx + bw && fx + fw > bx && fy < by + bh && fy + fh > by) hit.push(q.id);
      }
      setSelection(sectionId, hit);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5} px={0.5}>
        <Typography variant="caption" color="text.secondary">
          {pageIndex + 1} 페이지 · 필드 {fields.length}개
          {selectedIds.length > 1 ? ` · ${selectedIds.length}개 선택됨` : ''}
        </Typography>
        {placeType && (
          <Chip
            size="small"
            color="primary"
            label={`배치 모드: ${PALETTE.find((p) => p.type === placeType)?.label ?? placeType} — 캔버스에 드래그하거나 클릭`}
            onDelete={onPlaced}
          />
        )}
      </Stack>

      <Box
        ref={ref}
        onMouseDown={handleBackgroundMouseDown}
        sx={{
          position: 'relative',
          width: '100%',
          userSelect: 'none',
          cursor: placeType ? 'crosshair' : 'default',
        }}
      >
        <img
          ref={imgRef}
          src={image}
          alt={`page-${pageIndex + 1}`}
          style={{ width: '100%', display: 'block' }}
          draggable={false}
        />

        {/* 배치 모드에서 감지된 표 셀 힌트 */}
        {placeType &&
          cells?.map((c, ci) => (
            <Box
              key={ci}
              sx={{
                position: 'absolute',
                left: `${c.xPct}%`,
                top: `${c.yPct}%`,
                width: `${c.wPct}%`,
                height: `${c.hPct}%`,
                border: '1px dashed',
                borderColor: 'success.main',
                bgcolor: 'rgba(46,125,50,0.06)',
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}
            />
          ))}

        {/* 드래그 사각형(그리기=파랑, 선택=파랑 점선) */}
        {band && (
          <Box
            sx={{
              position: 'absolute',
              left: band.left,
              top: band.top,
              width: band.w,
              height: band.h,
              border: placeType ? '1.5px solid' : '1.5px dashed',
              borderColor: 'primary.main',
              bgcolor: 'rgba(30,58,95,0.10)',
              pointerEvents: 'none',
              zIndex: 30,
            }}
          />
        )}

        {size.width > 0 &&
          fields.map((q) => {
            const ov = q.overlay!;
            const isSel = selectedIds.includes(q.id);
            const pickField = (e: { ctrlKey?: boolean; metaKey?: boolean }) => {
              if (e.ctrlKey || e.metaKey) toggleSelect(sectionId, q.id);
              else if (!selectedIds.includes(q.id)) select({ sectionId, questionId: q.id });
            };
            return (
              <Rnd
                key={q.id}
                bounds="parent"
                disableDragging={!!placeType}
                enableResizing={!placeType}
                size={{
                  width: pctToPx(ov.wPct, size.width),
                  height: pctToPx(ov.hPct, size.height),
                }}
                position={{
                  x: pctToPx(ov.xPct, size.width),
                  y: pctToPx(ov.yPct, size.height),
                }}
                onDragStart={(e) => pickField(e as unknown as MouseEvent)}
                onResizeStart={(e) => pickField(e as unknown as MouseEvent)}
                onDragStop={(_e, d) => {
                  updateQuestionOverlay(sectionId, q.id, {
                    ...ov,
                    xPct: pxToPct(d.x, size.width),
                    yPct: pxToPct(d.y, size.height),
                  });
                }}
                onResizeStop={(_e, _dir, refEl, _delta, pos) => {
                  updateQuestionOverlay(sectionId, q.id, {
                    ...ov,
                    xPct: pxToPct(pos.x, size.width),
                    yPct: pxToPct(pos.y, size.height),
                    wPct: pxToPct(refEl.offsetWidth, size.width),
                    hPct: pxToPct(refEl.offsetHeight, size.height),
                  });
                }}
                style={{ zIndex: isSel ? 20 : 10 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    outline: isSel ? '2px solid' : '1px dashed',
                    outlineColor: isSel ? 'primary.main' : 'rgba(74,144,217,0.5)',
                    cursor: placeType ? 'crosshair' : 'move',
                  }}
                >
                  <FieldPreview q={q} showLabel={showLabel} />
                  {isSel && !placeType && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(sectionId, q.id);
                      }}
                      sx={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        bgcolor: 'error.main',
                        color: '#fff',
                        p: 0.25,
                        zIndex: 25,
                        '&:hover': { bgcolor: 'error.dark' },
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  )}
                </Box>
              </Rnd>
            );
          })}
      </Box>
    </Paper>
  );
}

interface Props {
  form: FormSchema;
}

export default function OverlayEditor({ form }: Props) {
  const pages = form.pages ?? [];
  const sectionId = form.sections[0]?.id ?? '';
  const questions = form.sections.flatMap((s) => s.questions);
  const { selectedIds, setFontSizeForSelected, addBlankPage, alignSelected } = useEditorStore();
  const [placeType, setPlaceType] = useState<QuestionType | null>(null);
  const multi = selectedIds.length >= 2;

  const selectedQuestions = questions.filter((q) => selectedIds.includes(q.id));
  const sizes = new Set(selectedQuestions.map((q) => q.fontSize ?? 13));
  const currentFont = sizes.size === 1 ? [...sizes][0] : '';
  const FONT_OPTIONS = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];

  return (
    <Box>
      {/* 상단 팔레트 (파워포인트식 삽입 도구) */}
      <Paper
        variant="outlined"
        sx={{ p: 1, mb: 1.5, position: 'sticky', top: 0, zIndex: 40, bgcolor: 'background.paper' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={placeType ?? 'cursor'}
            onChange={(_e, v) => setPlaceType(v === 'cursor' || v == null ? null : (v as QuestionType))}
          >
            <ToggleButton value="cursor" sx={{ px: 1 }}>
              <NearMeOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} /> 선택
            </ToggleButton>
            {PALETTE.map((p) => (
              <ToggleButton key={p.type} value={p.type} sx={{ px: 1 }}>
                {p.icon}
                <Box component="span" sx={{ ml: 0.5 }}>
                  {p.label}
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="선택한 텍스트 입력의 글자 크기를 일괄 변경">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <FormatSizeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Select
                size="small"
                displayEmpty
                value={currentFont === '' ? '' : String(currentFont)}
                disabled={selectedIds.length === 0}
                onChange={(e) => setFontSizeForSelected(Number(e.target.value))}
                sx={{ minWidth: 92 }}
                renderValue={(v) => (v ? `${v}px` : '글자 크기')}
              >
                {FONT_OPTIONS.map((s) => (
                  <MenuItem key={s} value={String(s)}>
                    {s}px
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Tooltip>
        </Stack>
        {/* 정렬/크기 맞추기 (2개 이상 선택 시) — 기준: 마지막 선택 */}
        {multi && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.75, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              정렬 <b>(기준: 마지막 선택)</b>
            </Typography>
            <Tooltip title="왼쪽 맞춤">
              <IconButton size="small" onClick={() => alignSelected('left')}>
                <AlignHorizontalLeftIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="가로 가운데 맞춤">
              <IconButton size="small" onClick={() => alignSelected('centerX')}>
                <AlignHorizontalCenterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="오른쪽 맞춤">
              <IconButton size="small" onClick={() => alignSelected('right')}>
                <AlignHorizontalRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="위쪽 맞춤">
              <IconButton size="small" onClick={() => alignSelected('top')}>
                <AlignVerticalTopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="세로 가운데 맞춤">
              <IconButton size="small" onClick={() => alignSelected('centerY')}>
                <AlignVerticalCenterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="아래쪽 맞춤">
              <IconButton size="small" onClick={() => alignSelected('bottom')}>
                <AlignVerticalBottomIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
            <Tooltip title="너비 맞춤">
              <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }} onClick={() => alignSelected('matchW')}>
                너비
              </Button>
            </Tooltip>
            <Tooltip title="높이 맞춤">
              <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }} onClick={() => alignSelected('matchH')}>
                높이
              </Button>
            </Tooltip>
            <Tooltip title="크기(너비+높이) 맞춤">
              <Button size="small" variant="outlined" sx={{ minWidth: 0, px: 1 }} onClick={() => alignSelected('matchSize')}>
                크기
              </Button>
            </Tooltip>
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          위에서 유형을 고른 뒤 캔버스에 <b>드래그해 그리거나 클릭</b>하면 배치됩니다. <b>선택</b> 모드에서
          박스를 드래그해 이동, 모서리로 크기 조절, 빈 곳 드래그로 영역 선택, <b>Ctrl+클릭</b> 다중 선택,
          여러 개 선택 시 <b>정렬·크기 맞춤</b>(기준=마지막 선택), <b>방향키</b> 이동, <b>Delete</b> 삭제,
          <b>Ctrl+C/V</b> 복사·붙여넣기, <b>Ctrl+Z</b> 실행 취소.
        </Typography>
      </Paper>

      {pages.map((p, i) => (
        <PageOverlay
          key={i}
          sectionId={sectionId}
          pageIndex={i}
          image={p.image}
          cells={p.cells}
          questions={questions}
          placeType={placeType}
          onPlaced={() => setPlaceType(null)}
          showLabel={!!form.canvas}
        />
      ))}

      <Box sx={{ textAlign: 'center', mt: 1, mb: 3 }}>
        <Chip
          label="+ 빈 페이지 추가"
          variant="outlined"
          onClick={addBlankPage}
          sx={{ cursor: 'pointer' }}
        />
      </Box>
    </Box>
  );
}
