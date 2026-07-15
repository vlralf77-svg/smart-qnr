// PDF 배경 위에 입력필드를 얹어 편집 — 드래그로 이동, 모서리로 크기 조절 (react-rnd)
import { Rnd } from 'react-rnd';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormSchema, Question, QuestionType, QUESTION_TYPE_META } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import { useElementSize } from '@/hooks/useElementSize';
import AddQuestionMenu from './AddQuestionMenu';

interface PageProps {
  sectionId: string;
  pageIndex: number;
  image: string;
  questions: Question[];
}

function PageOverlay({ sectionId, pageIndex, image, questions }: PageProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const { selected, select, updateQuestionOverlay, removeQuestion, addOverlayQuestion } =
    useEditorStore();

  const fields = questions.filter((q) => q.overlay && q.overlay.page === pageIndex);

  const pctToPx = (pct: number, dim: number) => (pct / 100) * dim;
  const pxToPct = (px: number, dim: number) => (dim > 0 ? (px / dim) * 100 : 0);

  const addAtCenter = (type: QuestionType) => {
    addOverlayQuestion(sectionId, type, {
      page: pageIndex,
      xPct: 40,
      yPct: 45,
      wPct: type === 'boolean' || type === 'radio' ? 6 : 20,
      hPct: 4,
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5} px={0.5}>
        <Typography variant="caption" color="text.secondary">
          {pageIndex + 1} 페이지 · 필드 {fields.length}개
        </Typography>
        <AddQuestionMenu onAdd={addAtCenter} label="이 페이지에 필드 추가" />
      </Stack>

      <Box ref={ref} sx={{ position: 'relative', width: '100%', userSelect: 'none' }}>
        <img src={image} alt={`page-${pageIndex + 1}`} style={{ width: '100%', display: 'block' }} />

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
                    sx={{ height: 16, fontSize: 9, m: 0.25, bgcolor: 'rgba(255,255,255,0.8)' }}
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
  // 오버레이 모드에서는 모든 문항을 첫 섹션에 담는다(§ pdfImport)
  const sectionId = form.sections[0]?.id ?? '';
  const questions = form.sections.flatMap((s) => s.questions);

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        원본 PDF 위의 파란 박스가 입력필드입니다. 박스를 드래그해 위치를, 모서리를 끌어 크기를
        조정하세요. 클릭하면 오른쪽에서 유형·라벨을 편집할 수 있습니다.
      </Typography>
      {pages.map((p, i) => (
        <PageOverlay
          key={i}
          sectionId={sectionId}
          pageIndex={i}
          image={p.image}
          questions={questions}
        />
      ))}
    </Box>
  );
}
