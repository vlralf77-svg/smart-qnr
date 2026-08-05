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
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import ChecklistIcon from '@mui/icons-material/Checklist';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
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
import { readingOrder } from '@/utils/questionOrder';

// 마지막 포인터 입력의 Ctrl/⌘ 눌림 상태를 캡처 단계에서 기록.
// (react-rnd 의 onDragStart 이벤트에는 ctrlKey 가 신뢰성 있게 담기지 않으므로 직접 추적)
let lastPointerCtrl = false;
if (typeof window !== 'undefined') {
  const track = (e: MouseEvent) => {
    lastPointerCtrl = e.ctrlKey || e.metaKey;
  };
  window.addEventListener('mousedown', track, true);
}

// 팔레트: 배치 가능한 컴포넌트 유형
const PALETTE: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: '단답', icon: <TextFieldsIcon sx={{ fontSize: 16 }} /> },
  { type: 'textarea', label: '장문', icon: <NotesIcon sx={{ fontSize: 16 }} /> },
  { type: 'number', label: '숫자', icon: <NumbersIcon sx={{ fontSize: 16 }} /> },
  { type: 'date', label: '날짜', icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> },
  { type: 'boolean', label: '체크박스', icon: <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} /> },
  { type: 'radio', label: '단일 선택', icon: <RadioButtonCheckedIcon sx={{ fontSize: 16 }} /> },
  { type: 'checkbox', label: '복수 선택', icon: <ChecklistIcon sx={{ fontSize: 16 }} /> },
  {
    type: 'select',
    label: '드롭다운',
    icon: <ArrowDropDownCircleOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  { type: 'info', label: '안내문', icon: <InfoOutlinedIcon sx={{ fontSize: 16 }} /> },
];

// 섹션별 색상 — 순서 배지·필드 외곽선에 사용해 어느 섹션에 속하는지 시각화
const SECTION_COLORS = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#7b1fa2',
  '#0288d1',
  '#c2185b',
  '#5d4037',
  '#455a64',
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
  const labelSize = fs;
  const labelColor = q.color ?? 'text.primary';

  // 예/아니오: [네모] 라벨 (단일 체크박스)
  if (q.type === 'boolean') {
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
        <Box
          sx={{
            width: 16,
            height: 16,
            flexShrink: 0,
            border: '1.5px solid #4a6fa5',
            borderRadius: '2px',
            bgcolor: 'rgba(255,255,255,0.92)',
          }}
        />
        {showLabel && (
          <Typography sx={{ fontSize: labelSize, color: labelColor, lineHeight: 1.1 }} noWrap>
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
        <Typography sx={{ fontSize: fs, color: labelColor, lineHeight: 1.2 }}>{label}</Typography>
      </Box>
    );
  }

  // 입력/선택 계열: (라벨) + 컨트롤(세로)
  let control: React.ReactNode;
  if (q.type === 'radio' || q.type === 'checkbox') {
    // 선택지 수만큼 라디오(○)/체크박스(▢) + 라벨
    const opts = q.options ?? [];
    const round = q.type === 'radio';
    control = (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'flex-start',
          gap: 0.6,
          overflow: 'hidden',
        }}
      >
        {opts.map((o) => (
          <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Box
              sx={{
                width: 13,
                height: 13,
                flexShrink: 0,
                border: '1.5px solid #4a6fa5',
                borderRadius: round ? '50%' : '2px',
                bgcolor: 'rgba(255,255,255,0.92)',
              }}
            />
            <Typography
              sx={{ fontSize: Math.min(fs, 13), color: labelColor, lineHeight: 1.1 }}
              noWrap
            >
              {o.label}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  } else if (q.type === 'select') {
    control = (
      <Box sx={{ ...INPUT_BOX, justifyContent: 'space-between', fontSize: fs, flex: 1 }}>
        <span style={{ opacity: 0.7 }}>{q.options?.[0]?.label ?? '선택'}</span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </Box>
    );
  } else {
    const ph =
      q.type === 'date' ? 'YYYY-MM-DD' : q.type === 'number' ? '0' : q.placeholder || '입력';
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
          sx={{ fontSize: labelSize, color: labelColor, fontWeight: 600, lineHeight: 1.1, mb: 0.2 }}
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
  /** 문항 id → 답변 순서번호 */
  orderMap: Record<string, number>;
  /** 문항 id → 소속 섹션 색상 */
  colorMap: Record<string, string>;
}

function findCell(
  cells: CellRegion[] | undefined,
  xPct: number,
  yPct: number,
): CellRegion | undefined {
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
  orderMap,
  colorMap,
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
        return { w: 4, h: squareH(4) };
      case 'textarea':
        return { w: 26, h: 10 };
      case 'number':
        return { w: 12, h: 4 };
      case 'date':
        return { w: 14, h: 4 };
      case 'select':
        return { w: 16, h: 5 };
      case 'radio':
      case 'checkbox':
        return { w: 34, h: 6 };
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
    if (cell && type === 'boolean') {
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
      const ctrl = lastPointerCtrl;
      if (isClick) {
        if (!ctrl) select(null); // Ctrl 없이 빈 곳 클릭 → 선택 해제
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
      // Ctrl+드래그면 기존 선택에 더함
      const next = ctrl
        ? Array.from(new Set([...useEditorStore.getState().selectedIds, ...hit]))
        : hit;
      setSelection(sectionId, next);
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
            const pickField = (ctrl: boolean) => {
              // Ctrl/⌘+클릭이면 선택 토글(하나씩 추가/제외), 아니면 단일 선택
              if (ctrl) toggleSelect(sectionId, q.id);
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
                onDragStart={() => pickField(false)}
                onResizeStart={() => pickField(false)}
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
                  // 일반 선택/드래그는 react-rnd 의 onDragStart 가 담당.
                  // Ctrl+클릭은 react-rnd 가 드래그로 보지 않아 onDragStart 가 안 뜨므로
                  // click 단계에서 따로 토글 처리(하나씩 추가/제외).
                  onClickCapture={(e) => {
                    if (!placeType && (e.ctrlKey || e.metaKey)) {
                      e.stopPropagation();
                      toggleSelect(sectionId, q.id);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    outline: isSel ? '2px solid' : '1.5px solid',
                    outlineColor: isSel
                      ? 'primary.main'
                      : (colorMap[q.id] ?? 'rgba(74,144,217,0.5)'),
                    cursor: placeType ? 'crosshair' : 'move',
                  }}
                >
                  {/* 답변 순서번호 배지(섹션 색) — 위치 조정 시 순서를 바로 확인 */}
                  {!placeType && orderMap[q.id] != null && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -9,
                        left: -9,
                        minWidth: 18,
                        height: 18,
                        px: 0.4,
                        borderRadius: '9px',
                        bgcolor: colorMap[q.id] ?? 'primary.main',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: '18px',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                        pointerEvents: 'none',
                        zIndex: 24,
                      }}
                    >
                      {orderMap[q.id]}
                    </Box>
                  )}
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
  const {
    selectedIds,
    setFontSizeForSelected,
    addBlankPage,
    alignSelected,
    groupSelectedIntoSection,
    assignSelectedToSection,
    ungroupSection,
    updateSection,
    moveSelectedToPage,
  } = useEditorStore();
  const [placeType, setPlaceType] = useState<QuestionType | null>(null);
  const multi = selectedIds.length >= 2;
  const hasSelection = selectedIds.length >= 1;

  const selectedQuestions = questions.filter((q) => selectedIds.includes(q.id));
  const sizes = new Set(selectedQuestions.map((q) => q.fontSize ?? 13));
  const currentFont = sizes.size === 1 ? [...sizes][0] : '';
  const FONT_OPTIONS = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];

  // 선택 항목이 모두 같은 페이지면 그 페이지를 표시(아니면 빈 값)
  const selPages = new Set(selectedQuestions.map((q) => q.overlay?.page ?? 0));
  const currentPage = selPages.size === 1 ? [...selPages][0] : '';

  // 답변(제시) 순서번호 + 섹션 색상 계산: 섹션 순서 → 섹션 내 읽기순서
  const orderMap: Record<string, number> = {};
  const colorMap: Record<string, string> = {};
  let running = 0;
  form.sections.forEach((s, si) => {
    const color = SECTION_COLORS[si % SECTION_COLORS.length];
    s.questions
      .filter((q) => q.overlay)
      .slice()
      .sort(readingOrder)
      .forEach((q) => {
        orderMap[q.id] = ++running;
        colorMap[q.id] = color;
      });
  });
  const multiSection = form.sections.length > 1;

  const renameSection = (id: string, current: string) => {
    const name = window.prompt('섹션 이름', current);
    if (name && name.trim()) updateSection(id, { title: name.trim() });
  };

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
            onChange={(_e, v) =>
              setPlaceType(v === 'cursor' || v == null ? null : (v as QuestionType))
            }
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

          <Tooltip title="선택한 텍스트 입력의 글자 크기를 일괄 변경" placement="top">
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

          <Tooltip title="선택한 컴포넌트를 다른 페이지로 이동" placement="top">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LayersOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Select
                size="small"
                displayEmpty
                value={currentPage === '' ? '' : String(currentPage)}
                disabled={!hasSelection || pages.length <= 1}
                onChange={(e) => moveSelectedToPage(Number(e.target.value))}
                sx={{ minWidth: 108 }}
                renderValue={(v) => (v !== '' ? `${Number(v) + 1}페이지` : '페이지 이동')}
              >
                {pages.map((_, i) => (
                  <MenuItem key={i} value={String(i)}>
                    {i + 1}페이지로 이동
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Tooltip>
        </Stack>
        {/* 정렬/크기 맞추기 — 항상 표시(2개 이상 선택해야 활성) · 기준: 마지막 선택 */}
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{
            mt: 0.75,
            pt: 0.75,
            borderTop: '1px dashed',
            borderColor: 'divider',
            opacity: multi ? 1 : 0.55,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            정렬 {multi ? <b>(기준: 마지막 선택)</b> : '(2개 이상 선택 시)'}
          </Typography>
          <Tooltip title="왼쪽 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('left')}>
                <AlignHorizontalLeftIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="가로 가운데 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('centerX')}>
                <AlignHorizontalCenterIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="오른쪽 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('right')}>
                <AlignHorizontalRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="위쪽 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('top')}>
                <AlignVerticalTopIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="세로 가운데 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('centerY')}>
                <AlignVerticalCenterIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="아래쪽 맞춤">
            <span>
              <IconButton size="small" disabled={!multi} onClick={() => alignSelected('bottom')}>
                <AlignVerticalBottomIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <Tooltip title="너비 맞춤">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={!multi}
                sx={{ minWidth: 0, px: 1 }}
                onClick={() => alignSelected('matchW')}
              >
                너비
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="높이 맞춤">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={!multi}
                sx={{ minWidth: 0, px: 1 }}
                onClick={() => alignSelected('matchH')}
              >
                높이
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="크기(너비+높이) 맞춤">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={!multi}
                sx={{ minWidth: 0, px: 1 }}
                onClick={() => alignSelected('matchSize')}
              >
                크기
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {/* 섹션 그룹 — 선택 항목을 섹션으로 묶고, 섹션별 색/순서 확인 */}
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 0.75, pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            섹션 <b>({form.sections.length})</b>
          </Typography>
          {form.sections.map((s, si) => {
            const count = s.questions.filter((q) => q.overlay).length;
            const color = SECTION_COLORS[si % SECTION_COLORS.length];
            return (
              <Chip
                key={s.id}
                size="small"
                variant="outlined"
                onClick={() => renameSection(s.id, s.title)}
                onDelete={multiSection ? () => ungroupSection(s.id) : undefined}
                label={
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
                    {s.title} · {count}
                  </Box>
                }
                sx={{ borderColor: color }}
              />
            );
          })}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="선택한 컴포넌트를 새 섹션으로 묶기">
            <span>
              <Button
                size="small"
                variant="contained"
                disabled={!hasSelection}
                sx={{ minWidth: 0, px: 1 }}
                onClick={() => groupSelectedIntoSection()}
              >
                + 새 섹션으로 묶기
              </Button>
            </span>
          </Tooltip>
          <Select
            size="small"
            displayEmpty
            value=""
            disabled={!hasSelection || form.sections.length < 1}
            onChange={(e) => e.target.value && assignSelectedToSection(String(e.target.value))}
            sx={{ minWidth: 128 }}
            renderValue={() => '섹션으로 이동…'}
          >
            {form.sections.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.title}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          위에서 유형을 고른 뒤 캔버스에 <b>드래그해 그리거나 클릭</b>하면 배치됩니다. <b>선택</b>{' '}
          모드에서 박스를 드래그해 이동, 모서리로 크기 조절, 빈 곳 드래그로 영역 선택,{' '}
          <b>Ctrl+클릭</b> 다중 선택, 여러 개 선택 시 <b>정렬·크기 맞춤</b>(기준=마지막 선택),{' '}
          <b>방향키</b> 이동, <b>Delete</b> 삭제,
          <b>Ctrl+C/V</b> 복사·붙여넣기, <b>Ctrl+Z</b> 실행 취소. 각 필드의 <b>번호=답변 순서</b>
          이며, 여러 개를 선택해 <b>새 섹션으로 묶으면</b> 모바일에서 섹션(단계)별로 나뉘어
          표시됩니다. 선택 후 상단 <b>페이지 이동</b>으로 다른 페이지로 옮길 수 있습니다.
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
          orderMap={orderMap}
          colorMap={colorMap}
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
