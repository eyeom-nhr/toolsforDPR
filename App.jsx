import { useState, useEffect, useRef } from 'react'

/* ═══════════ HELPERS ═══════════ */
const ROUNDS = ['16강', '8강', '4강', '결승']
const BOUNDS = [0, 8, 12, 14, 15]

const ytId = (url) => {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s#]+)/)
  return m ? m[1] : null
}
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
const ytUrl = (id) => `https://www.youtube.com/watch?v=${id}`
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
const getRound = (i) => (i < 8 ? 0 : i < 12 ? 1 : i < 14 ? 2 : 3)

function nextSlot(i) {
  if (i >= 14) return null
  if (i < 8) return { idx: 8 + (i >> 1), slot: i & 1 }
  if (i < 12) return { idx: 12 + ((i - 8) >> 1), slot: (i - 8) & 1 }
  return { idx: 14, slot: (i - 12) & 1 }
}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function buildMatches(vids) {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    v1: i < 8 ? vids[i * 2] : null,
    v2: i < 8 ? vids[i * 2 + 1] : null,
    winner: null, s1: 0, s2: 0,
  }))
}

/* ═══════════ PERSISTENCE ═══════════ */
const LS = 'vwc_state'
const saveState = (s) => { try { localStorage.setItem(LS, JSON.stringify(s)) } catch {} }
const loadState = () => { try { const s = localStorage.getItem(LS); return s ? JSON.parse(s) : null } catch { return null } }
const clearState = () => { try { localStorage.removeItem(LS) } catch {} }

/* ═══════════ CONFETTI ═══════════ */
function Confetti() {
  const colors = ['#FF6B35', '#FFD166', '#4ADE80', '#60A5FA', '#F472B6']
  const pieces = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i, left: Math.random() * 100, color: colors[i % 5],
      w: 6 + Math.random() * 6, delay: Math.random() * 2.5,
      dur: 2.2 + Math.random() * 2,
    }))
  ).current
  return (
    <div className="confetti-wrap">
      {pieces.map((p) => (
        <div key={p.id} className="confetti-piece" style={{
          left: p.left + '%', background: p.color,
          width: p.w, height: p.w * 1.5,
          borderRadius: Math.random() > 0.5 ? '50%' : '1px',
          animationDelay: p.delay + 's', animationDuration: p.dur + 's',
        }} />
      ))}
    </div>
  )
}

/* ═══════════ CONFIRM MODAL ═══════════ */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--sf)', border: '1px solid var(--bd)',
        padding: '28px 32px', maxWidth: 360, textAlign: 'center',
      }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div className="btn-row">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>취소</button>
          <button className="btn btn-accent btn-sm" onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ BRACKET ═══════════ */
function BracketEntry({ v, votes, win, lose }) {
  if (!v) return <div className="bracket-entry b-tbd"><span className="b-name">—</span></div>
  const vid = v.videoId
  return (
    <div className={`bracket-entry ${win ? 'b-win' : lose ? 'b-lose' : ''}`}>
      {vid ? <img className="b-thumb" src={thumb(vid)} alt="" loading="lazy" /> : <div className="b-thumb" />}
      <span className="b-name">{v.title}</span>
      {votes != null && <span className="b-votes">{votes}</span>}
    </div>
  )
}

function Bracket({ matches, videos }) {
  const fv = (v) => v ? videos.find((x) => x.id === v.id) : null
  return (
    <div className="bracket">
      {ROUNDS.map((name, ri) => {
        const rm = matches.slice(BOUNDS[ri], BOUNDS[ri + 1])
        return (
          <div className="bracket-round" key={ri}>
            <div className="bracket-round-title">{name}</div>
            <div className="bracket-matches">
              {rm.map((m) => {
                const a = fv(m.v1), b = fv(m.v2)
                return (
                  <div className="bracket-match" key={m.id}>
                    <BracketEntry v={a} votes={m.winner != null ? m.s1 : null}
                      win={m.winner === a?.id} lose={m.winner != null && m.winner !== a?.id} />
                    <div className="bracket-div" />
                    <BracketEntry v={b} votes={m.winner != null ? m.s2 : null}
                      win={m.winner === b?.id} lose={m.winner != null && m.winner !== b?.id} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════ BULK PASTE MODAL ═══════════ */
function BulkPasteModal({ onApply, onClose }) {
  const [text, setText] = useState('')
  const placeholder = `한 줄에 하나씩 입력하세요. 형식:\nURL | 제목 | 소개(선택) | 추천인(선택)\n\n예시:\nhttps://youtube.com/watch?v=abc123 | Bohemian Rhapsody | 전설의 기타 솔로 | 홍길동\nhttps://youtu.be/xyz789 | Hotel California`

  const parse = () => {
    const lines = text.trim().split('\n').filter(Boolean)
    const entries = lines.map((line) => {
      const parts = line.split('|').map((s) => s.trim())
      return {
        url: parts[0] || '',
        title: parts[1] || '',
        desc: parts[2] || '',
        rec: parts[3] || '',
      }
    })
    onApply(entries)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--sf)', border: '1px solid var(--bd)',
        padding: '24px', width: '90%', maxWidth: 600,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>한번에 붙여넣기</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', height: 280, background: 'var(--bg2)', border: '1px solid var(--bd)',
            color: 'var(--tx)', padding: 12, fontFamily: 'var(--font)', fontSize: 13,
            outline: 'none', resize: 'vertical', lineHeight: 1.6,
          }}
        />
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-accent btn-sm" onClick={parse}>적용</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ SETUP ═══════════ */
function Setup({ onStart }) {
  const [title, setTitle] = useState('')
  const [entries, setEntries] = useState(
    Array.from({ length: 16 }, () => ({ url: '', title: '', desc: '', rec: '' }))
  )
  const [vc, setVc] = useState(1)
  const [playMode, setPlayMode] = useState('inline')
  const [showBulk, setShowBulk] = useState(false)

  const upd = (i, f, v) => setEntries((p) => {
    const n = [...p]; n[i] = { ...n[i], [f]: v }; return n
  })
  const filled = entries.filter((e) => e.url && ytId(e.url) && e.title.trim()).length
  const ok = title.trim() && filled === 16

  const applyBulk = (parsed) => {
    setEntries((prev) => {
      const next = [...prev]
      parsed.forEach((p, i) => {
        if (i < 16) next[i] = { ...next[i], ...p }
      })
      return next
    })
    setShowBulk(false)
  }

  return (
    <div>
      <div className="header">
        <div className="header-tag">Video World Cup</div>
        <div className="header-title">새로운 월드컵 만들기</div>
      </div>

      <div className="setup-title-wrap">
        <label className="setup-label">월드컵 이름</label>
        <input
          className="setup-title-input"
          placeholder="최고의 기타 솔로 월드컵"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="setup-options">
        <div className="setup-opt">
          <label>투표 인원</label>
          <input type="number" min={1} max={20} value={vc}
            onChange={(e) => setVc(Math.max(1, Math.min(20, +e.target.value || 1)))} />
        </div>
        <div className="setup-opt">
          <label>영상 재생</label>
          <select value={playMode} onChange={(e) => setPlayMode(e.target.value)}>
            <option value="inline">페이지 내 재생</option>
            <option value="outlink">유튜브에서 보기</option>
          </select>
        </div>
      </div>

      <div className="setup-bar">
        <span className="setup-count">
          <em className={filled === 16 ? 'done' : 'pending'}>{filled}</em> / 16 등록
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(true)}>
            한번에 붙여넣기
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setEntries(shuffle)}>
            셔플
          </button>
        </div>
      </div>

      <div className="entry-grid">
        {entries.map((e, i) => {
          const vid = ytId(e.url)
          return (
            <div className={`entry ${vid && e.title ? 'filled' : ''}`} key={i}>
              <div className="e-num">{String(i + 1).padStart(2, '0')}</div>
              <input className="e-url" placeholder="YouTube URL" value={e.url}
                onChange={(ev) => upd(i, 'url', ev.target.value)} />
              <input className="e-title" placeholder="제목 *" value={e.title}
                onChange={(ev) => upd(i, 'title', ev.target.value)} />
              <input className="e-desc" placeholder="한줄 소개" value={e.desc}
                onChange={(ev) => upd(i, 'desc', ev.target.value)} />
              <input className="e-rec" placeholder="추천인" value={e.rec}
                onChange={(ev) => upd(i, 'rec', ev.target.value)} />
              <div className="e-thumb">
                {vid
                  ? <img src={thumb(vid)} alt="" loading="lazy" />
                  : <span className="e-thumb-empty">URL 입력</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="btn-row">
        <button className="btn btn-accent" disabled={!ok} onClick={() => {
          const vids = entries.map((e, i) => ({
            id: i, url: e.url, title: e.title.trim(), desc: e.desc,
            rec: e.rec, videoId: ytId(e.url),
          }))
          onStart({ title: title.trim(), videos: vids, voterCount: vc, playMode })
        }}>
          {ok ? '🏆  월드컵 시작' : `영상 ${16 - filled}개 더 등록하세요`}
        </button>
      </div>

      {showBulk && <BulkPasteModal onApply={applyBulk} onClose={() => setShowBulk(false)} />}
    </div>
  )
}

/* ═══════════ MATCH CARD ═══════════ */
function MatchCard({
  video, isMyChoice, count, revealed, isWin, isLose,
  onVote, disabled, playMode, showTurnNotice,
}) {
  const [playing, setPlaying] = useState(false)
  const vid = video?.videoId

  const handleMedia = () => {
    if (!vid) return
    if (playMode === 'outlink') window.open(ytUrl(vid), '_blank')
    else setPlaying(true)
  }

  useEffect(() => { setPlaying(false) }, [video?.id])

  const cls = [
    'match-card',
    revealed && isWin ? 'is-winner' : '',
    revealed && isLose ? 'is-loser' : '',
  ].join(' ')

  return (
    <div className={cls}>
      {playing && vid ? (
        <div className="card-embed">
          <iframe src={embedUrl(vid)} allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      ) : (
        <div className="card-media" onClick={handleMedia}>
          {vid ? (
            <>
              <img src={thumb(vid)} alt={video?.title || ''} />
              <div className="play-overlay">
                <div className="play-circle">
                  <svg viewBox="0 0 24 24"><polygon points="7,4 21,12 7,20" /></svg>
                </div>
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--tx3)', fontSize: 12 }}>미리보기 없음</span>
          )}
        </div>
      )}

      <div className="card-body">
        <div className="card-title">{video?.title || '—'}</div>
        {video?.desc && <div className="card-desc">{video.desc}</div>}
        {video?.rec && <div className="card-rec">추천 {video.rec}</div>}
      </div>

      {revealed ? (
        <div className="card-result">
          <div className={`card-result-count ${isWin ? 'is-win' : ''}`}>{count}</div>
          {isWin && <div className="card-result-label">Win</div>}
        </div>
      ) : (
        <div className="card-vote">
          {showTurnNotice ? (
            <div className="vote-turn-notice">✓ 투표 완료 — 다음 사람 차례</div>
          ) : (
            <button className="vote-btn" onClick={onVote} disabled={disabled}>
              이 영상에 투표
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════ MATCH SCREEN ═══════════ */
function Match({ tournament, onAdvance, onReset }) {
  const { matches, currentMatch: ci, title: tTitle, voterCount, playMode } = tournament
  const match = matches[ci]

  // Voting state
  const [s1, setS1] = useState(0)
  const [s2, setS2] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [justVoted, setJustVoted] = useState(null)  // which side just got a vote (1 or 2)
  const [voteLock, setVoteLock] = useState(false)    // prevents double-click
  const [confirmReset, setConfirmReset] = useState(false)
  const matchLoaded = useRef(false)

  // Load persisted votes for current match
  useEffect(() => {
    matchLoaded.current = false
    const key = `vwc_match_${ci}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const { s1: ps1, s2: ps2 } = JSON.parse(saved)
        setS1(ps1 || 0)
        setS2(ps2 || 0)
      } else {
        setS1(0); setS2(0)
      }
    } catch {
      setS1(0); setS2(0)
    }
    setRevealed(false)
    setJustVoted(null)
    setVoteLock(false)
    // Mark as loaded after state updates are flushed
    requestAnimationFrame(() => { matchLoaded.current = true })
  }, [ci])

  // Persist votes on change (only after initial load)
  useEffect(() => {
    if (!matchLoaded.current) return
    try { localStorage.setItem(`vwc_match_${ci}`, JSON.stringify({ s1, s2 })) } catch {}
  }, [ci, s1, s2])

  const total = s1 + s2
  const allIn = total >= voterCount
  const remaining = voterCount - total

  // Auto-reveal when all votes are in
  useEffect(() => {
    if (allIn && !revealed) {
      const t = setTimeout(() => setRevealed(true), 600)
      return () => clearTimeout(t)
    }
  }, [allIn, revealed])

  // Cast vote with double-click prevention + turn handoff
  const castVote = (side) => {
    if (voteLock || allIn) return
    setVoteLock(true)
    setJustVoted(side)

    if (side === 1) setS1((p) => p + 1)
    else setS2((p) => p + 1)

    // After brief confirmation, unlock for next voter
    setTimeout(() => {
      setJustVoted(null)
      setVoteLock(false)
    }, voterCount > 1 ? 900 : 300)
  }

  const isTie = revealed && s1 === s2
  const winner = s1 > s2 ? 1 : s1 < s2 ? 2 : null

  const resetVotes = () => {
    setS1(0); setS2(0); setRevealed(false); setJustVoted(null); setVoteLock(false)
    try { localStorage.removeItem(`vwc_match_${ci}`) } catch {}
  }

  const forceReveal = () => { if (total > 0) setRevealed(true) }

  const ri = getRound(ci)
  const rStart = BOUNDS[ri]
  const rEnd = BOUNDS[ri + 1]
  const voteLabel = voterCount > 1
    ? (justVoted ? `${total}/${voterCount}명 투표 완료` : `${total}/${voterCount}명 투표 · ${remaining}명 남음`)
    : ''

  return (
    <div>
      <div className="header">
        <div className="header-tag">Video World Cup</div>
        <div className="header-title">{tTitle}</div>
        <button className="header-reset" onClick={() => setConfirmReset(true)}>처음으로</button>
      </div>

      <div className="round-header">
        <div className="round-name">{ROUNDS[ri]}</div>
        <div className="round-sub">{ci - rStart + 1} / {rEnd - rStart} 경기</div>
      </div>

      <div className="progress">
        <div className="progress-fill" style={{ width: ((ci + 1) / 15) * 100 + '%' }} />
      </div>

      {voterCount > 1 && (
        <div className="vote-status">
          {voteLabel}
          {!allIn && total > 0 && !revealed && !justVoted && (
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 10 }} onClick={forceReveal}>
              여기서 마감
            </button>
          )}
        </div>
      )}

      <div className="match-layout">
        <MatchCard
          video={match.v1}
          isMyChoice={justVoted === 1}
          count={s1}
          revealed={revealed}
          isWin={revealed && winner === 1}
          isLose={revealed && winner === 2}
          onVote={() => castVote(1)}
          disabled={voteLock || allIn}
          playMode={playMode}
          showTurnNotice={voterCount > 1 && !revealed && justVoted !== null}
        />

        <div className="vs-divider"><div className="vs-text">VS</div></div>

        <MatchCard
          video={match.v2}
          isMyChoice={justVoted === 2}
          count={s2}
          revealed={revealed}
          isWin={revealed && winner === 2}
          isLose={revealed && winner === 1}
          onVote={() => castVote(2)}
          disabled={voteLock || allIn}
          playMode={playMode}
          showTurnNotice={voterCount > 1 && !revealed && justVoted !== null}
        />
      </div>

      {isTie && (
        <div className="match-next">
          <div className="tie-msg">동점! 다시 투표해주세요</div>
          <button className="btn btn-accent" onClick={resetVotes}>재투표</button>
        </div>
      )}

      {revealed && !isTie && (
        <div className="match-next">
          <button className="btn btn-accent" onClick={() => {
            const wId = winner === 1 ? match.v1?.id : match.v2?.id
            // Clean up match votes from localStorage
            try { localStorage.removeItem(`vwc_match_${ci}`) } catch {}
            onAdvance(ci, wId, s1, s2)
          }}>
            {ci === 14
              ? '🏆  최종 결과 보기'
              : ci + 1 === rEnd
                ? `${ROUNDS[ri + 1]} 대진표 보기 →`
                : '다음 경기 →'}
          </button>
        </div>
      )}

      {confirmReset && (
        <ConfirmModal
          message="진행 중인 월드컵이 초기화됩니다. 정말 처음으로 돌아갈까요?"
          onConfirm={() => { setConfirmReset(false); onReset() }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}

/* ═══════════ TRANSITION ═══════════ */
function Transition({ nextRound, matches, videos, onContinue }) {
  return (
    <div>
      <div className="transition">
        <div className="transition-round">{ROUNDS[nextRound]}</div>
        <div className="transition-sub">대진표를 확인하세요</div>
        <button className="btn btn-accent" onClick={onContinue}>{ROUNDS[nextRound]} 시작 →</button>
      </div>
      <hr className="divider" />
      <Bracket matches={matches} videos={videos} />
    </div>
  )
}

/* ═══════════ RESULT ═══════════ */
function Result({ winner, matches, videos, onReset }) {
  const vid = winner?.videoId
  return (
    <div>
      <Confetti />
      <div className="result">
        <div className="result-crown">👑</div>
        <div className="result-tag">Champion</div>
        <div className="result-title">{winner?.title}</div>
        {winner?.desc && <div className="result-desc">{winner.desc}</div>}
        {winner?.rec && <div className="result-rec">추천 {winner.rec}</div>}
        {vid && <img className="result-thumb" src={thumb(vid)} alt={winner.title} />}
        <div className="btn-row">
          {vid && (
            <button className="btn btn-outline" onClick={() => window.open(ytUrl(vid), '_blank')}>
              ▶ 유튜브에서 보기
            </button>
          )}
          <button className="btn btn-accent" onClick={onReset}>새 월드컵 만들기</button>
        </div>
      </div>
      <hr className="divider" />
      <div className="section-title">전체 대진 결과</div>
      <Bracket matches={matches} videos={videos} />
    </div>
  )
}

/* ═══════════════════════════════════════
   APP
   ═══════════════════════════════════════ */
export default function App() {
  const [tournament, setTournament] = useState(null)
  const [nextRound, setNextRound] = useState(1)
  const [ready, setReady] = useState(false)

  // Load state on mount
  useEffect(() => {
    const s = loadState()
    if (s?.tournament) {
      setTournament(s.tournament)
      if (s.nextRound) setNextRound(s.nextRound)
    }
    setReady(true)
  }, [])

  const persist = (t, nr) => {
    setTournament(t)
    if (nr !== undefined) setNextRound(nr)
    saveState({ tournament: t, nextRound: nr ?? nextRound })
  }

  const handleStart = ({ title, videos, voterCount, playMode }) => {
    const t = {
      title, videos, voterCount, playMode,
      matches: buildMatches(videos),
      currentMatch: 0,
      phase: 'match',
    }
    persist(t)
  }

  const handleAdvance = (mi, winnerId, s1, s2) => {
    const ms = [...tournament.matches]
    ms[mi] = { ...ms[mi], winner: winnerId, s1, s2 }

    const ns = nextSlot(mi)
    if (ns) {
      const wv = ms[mi].v1?.id === winnerId ? ms[mi].v1 : ms[mi].v2
      ms[ns.idx] = { ...ms[ns.idx] }
      if (ns.slot === 0) ms[ns.idx].v1 = wv
      else ms[ns.idx].v2 = wv
    }

    const ri = getRound(mi)
    const rEnd = BOUNDS[ri + 1]

    if (mi === 14) {
      persist({ ...tournament, matches: ms, phase: 'result', currentMatch: mi })
    } else if (mi + 1 === rEnd) {
      const nr = ri + 1
      persist({ ...tournament, matches: ms, phase: 'transition', currentMatch: mi + 1 }, nr)
    } else {
      persist({ ...tournament, matches: ms, currentMatch: mi + 1 })
    }
  }

  const handleContinue = () => persist({ ...tournament, phase: 'match' })

  const handleReset = () => {
    setTournament(null)
    clearState()
    // Clean up any match vote keys
    for (let i = 0; i < 15; i++) {
      try { localStorage.removeItem(`vwc_match_${i}`) } catch {}
    }
  }

  if (!ready) {
    return (
      <div className="app">
        <div className="loading"><div className="spinner" /> 불러오는 중</div>
      </div>
    )
  }

  const phase = tournament?.phase
  const finalWinner = phase === 'result' && tournament.matches[14]?.winner != null
    ? tournament.videos.find((v) => v.id === tournament.matches[14].winner)
    : null

  return (
    <div className="app">
      {!tournament && <Setup onStart={handleStart} />}
      {phase === 'match' && (
        <Match tournament={tournament} onAdvance={handleAdvance} onReset={handleReset} />
      )}
      {phase === 'transition' && (
        <Transition
          nextRound={nextRound}
          matches={tournament.matches}
          videos={tournament.videos}
          onContinue={handleContinue}
        />
      )}
      {phase === 'result' && finalWinner && (
        <Result
          winner={finalWinner}
          matches={tournament.matches}
          videos={tournament.videos}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
