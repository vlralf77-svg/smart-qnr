// PDF 배경 위에 입력필드를 얹어 편집 — 드래그로 이동, 모서리로 크기 조절 (react-rnd)
// + PDF 위를 클릭해 그 자리에 필드 배치(표 빈칸 등)
import { useState } from 'react';
import { Rnd } from 'react-rnd';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import BlockIcon from '@mui/icons-material/Block';
import { CellRegion, FormSchema, Question, QuestionType, QUESTION_TYPE_META } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { useElementSize } from '@/hooks/useElementSize';
import AddQuestionMenu from './AddQuestionMenu';

type PlaceMode = 'off' | 'boolean' | 'text';

interface PageProps {
  sectionId: string;
  pageIndex: number;
  image: string;
  cells?: CellRegion[];
  questions: Question[];
}

function findCell(cells: CellRegion[] | undefined, xPct: number, yPct: number): CellRegion | undefined {
  if (!cells) return undefined;
  // 클릭 지점을 포함하는 가장 작은 셀
  let best: CellRegion | undefined;
  for (const c of cells) {
    if (xPct >= c.xPct && xPct <= c.xPct + c.wPct && yPct >= c.yPct && yPct <= c.yPct + c.hPct) {
      if (!best || c.wPct * c.hPct < best.wPct * best.hPct) best = c;
    }
  }
  return best;
}

function PageOverlay({ sectionId, pageIndex, image, cells, questions }: PageProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const { selected, select, updateQuestionOverlay, removeQuestion, addOverlayQuestion } =
    useEditorStore();
  const [placeMode, setPlaceMode] = useState<PlaceMode>('off');

  const fields = questions.filter((q) => q.overlay && q.overlay.page === pageIndex);

  const pctToPx = (pct: number, dim: number) => (pct / 100) * dim;
  const pxToPct = (px: number, dim: number) => (dim > 0 ? (px / dim) * 100 : 0);

  // 화면 비율에 맞춰 정사각형(체크박스)에 가까운 hPct 계산
  const squareH = (wPct: number) => (size.height > 0 ? wPct * (size.width / size.height) : wPct);

  const addAtCenter = (type: QuestionType) => {
    addOverlayQuestion(sectionId, type, {
      page: pageIndex,
      xPct: 42,
      yPct: 45,
      wPct: type === 'boolean' || type === 'radio' ? 4 : 20,
      hPct: type === 'boolean' || type === 'radio' ? squareH(4) : 4,
    });
  };

  // PDF 배경 클릭 → 클릭 위치에 필드 배치 (표 셀 안이면 셀 크기에 자동 스냅)
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (placeMode === 'off' || !ref.current) {
      select(null);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const cell = findCell(cells, xPct, yPct);
    if (cell) {
      const padX = Math.min(0.6, cell.wPct * 0.06);
      const padY = Math.min(0.6, cell.hPct * 0.08);
      if (placeMode === 'text') {
        // 텍스트: 셀 전체를 채움
        addOverlayQuestion(sectionId, 'text', {
          page: pageIndex,
          xPct: cell.xPct + padX,
          yPct: cell.yPct + padY,
          wPct: cell.wPct - padX * 2,
          hPct: cell.hPct - padY * 2,
        });
      } else {
        // 체크박스: 셀 중앙에 정사각형
        const boxH = Math.min(cell.hPct - padY * 2, squareH(cell.wPct));
        const boxW = size.height > 0 ? boxH * (size.height / size.width) : cell.wPct * 0.5;
        addOverlayQuestion(sectionId, 'boolean', {
          page: pageIndex,
          xPct: cell.xPct + cell.wPct / 2 - boxW / 2,
          yPct: cell.yPct + cell.hPct / 2 - boxH / 2,
          wPct: boxW,
          hPct: boxH,
        });
      }
      return;
    }

    // 셀 밖: 고정 크기
    const wPct = placeMode === 'boolean' ? 4 : 16;
    const hPct = placeMode === 'boolean' ? squareH(4) : 4;
    addOverlayQuestion(sectionId, placeMode, {
      page: pageIndex,
      xPct: Math.max(0, xPct - wPct / 2),
      yPct: Math.max(0, yPct - hPct / 2),
      wPct,
      hPct,
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5} px={0.5}>
        <Typography variant="caption" color="text.secondary">
          {pageIndex + 1} 페이지 · 필드 {fields.length}개
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="클릭 배치: 켜면 PDF 위를 클릭한 자리에 필드가 생깁니다(표 빈칸 등)">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={placeMode}
              onChange={(_e, v) => setPlaceMode((v as PlaceMode) ?? 'off')}
            >
              <ToggleButton value="off" sx={{ px: 1 }}>
                <BlockIcon sx={{ fontSize: 16, mr: 0.5 }} /> 끄기
              </ToggleButton>
              <ToggleButton value="boolean" sx={{ px: 1 }}>
                <CheckBoxOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} /> 체크박스
              </ToggleButton>
              <ToggleButton value="text" sx={{ px: 1 }}>
                <TextFieldsIcon sx={{ fontSize: 16, mr: 0.5 }} /> 텍스트
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          <AddQuestionMenu onAdd={addAtCenter} label="기타 유형 추가" />
        </Stack>
      </Stack>

      <Box
        ref={ref}
        sx={{
          position: 'relative',
          width: '100%',
          userSelect: 'none',
          cursor: placeMode === 'off' ? 'default' : 'crosshair',
        }}
      >
        <img
          src={image}
          alt={`page-${pageIndex + 1}`}
          style={{ width: '100%', display: 'block' }}
          onClick={handleBackgroundClick}
          draggable={false}
        />

        {/* 클릭 배치 모드일 때 감지된 표 셀 힌트(클릭은 통과) */}
        {placeMode !== 'off' &&
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

        {size.width > 0 &&
          fields.map((q) => {
            const ov = q.overlay!;
            const isSel = selected?.questionId === q.id;
            const meta = QUESTION_TYPE_META[q.type];
            return (
              <Rnd
                key={q.id}
                bounds="parent"
                size={{
                  width: pctToPx(ov.wPct, size.width),
                  height: pctToPx(ov.hPct, size.height),
                }}
                position={{
                  x: pctToPx(ov.xPct, size.width),
                  y: pctToPx(ov.yPct, size.height),
                }}
                onMouseDown={() => select({ sectionId, questionId: q.id })}
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
                    border: '1.5px solid',
                    borderColor: isSel ? 'primary.main' : 'secondary.main',
                    bgcolor: isSel ? 'rgba(30,58,95,0.14)' : 'rgba(74,144,217,0.10)',
                    borderRadius: 0.5,
                    boxSizing: 'border-box',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Chip
                    label={meta.label}
                    size="small"
                    sx={{ height: 15, fontSize: 8, m: 0.2, bgcolor: 'rgba(255,255,255,0.85)' }}
                  />
                  {isSel && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(sectionId, q.id);
                      }}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        bgcolor: 'error.main',
                        color: '#fff',
                        p: 0.25,
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

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        파란 박스가 입력필드입니다. 박스를 드래그해 위치를, 모서리를 끌어 크기를 조정하고, 클릭하면
        오른쪽에서 유형·라벨을 편집합니다. <b>표 안의 빈칸</b>은 상단 <b>클릭 배치</b>를 켜고 원하는
        자리를 클릭해 필드를 추가하세요.
      </Typography>
      {pages.map((p, i) => (
        <PageOverlay
          key={i}
          sectionId={sectionId}
          pageIndex={i}
          image={p.image}
          cells={p.cells}
          questions={questions}
        />
      ))}
    </Box>
  );
}
