import { useState, useEffect, useRef } from 'react'

/* ═══════════ UTILS ═══════════ */
const ytId = (url) => {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s#]+)/)
  return m ? m[1] : null
}
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
const ytUrl = (id) => `https://www.youtube.com/watch?v=${id}`
const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`

/* ═══════════ TOURNAMENT CONFIG ═══════════ */
function getConfig(size) {
  if (size === 8) return { rounds: ['8강', '4강', '결승'], bounds: [0, 4, 6, 7], total: 7 }
  return { rounds: ['16강', '8강', '4강', '결승'], bounds: [0, 8, 12, 14, 15], total: 15 }
}

function getRound(i, bounds) {
  for (let r = 0; r < bounds.length - 1; r++) {
    if (i >= bounds[r] && i < bounds[r + 1]) return r
  }
  return bounds.length - 2
}

function nextSlot(i, bounds) {
  const ri = getRound(i, bounds)
  if (ri >= bounds.length - 2) return null
  const local = i - bounds[ri]
  return { idx: bounds[ri + 1] + Math.floor(local / 2), slot: local % 2 }
}

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function buildMatches(vids, totalMatches) {
  const first = vids.length / 2
  return Array.from({ length: totalMatches }, (_, i) => ({
    id: i, v1: i < first ? vids[i * 2] : null, v2: i < first ? vids[i * 2 + 1] : null,
    winner: null, s1: 0, s2: 0,
  }))
}

/* ═══════════ PERSISTENCE ═══════════ */
const LS = 'vwc'
const save = (t) => { try { localStorage.setItem(LS, JSON.stringify(t)) } catch {} }
const clear = () => { try { localStorage.removeItem(LS) } catch {} }
function load() {
  try {
    const s = localStorage.getItem(LS)
    if (!s) return null
    const t = JSON.parse(s)
    if (!t || !t.phase || !t.matches || !t.videos) { clear(); return null }
    return t
  } catch { clear(); return null }
}

/* ═══════════ URL SHARE ═══════════ */
function encodeSetup(setup) {
  // compact: only essential fields, short keys
  const data = {
    t: setup.title,
    s: setup.size,
    v: setup.voterCount,
    p: setup.playMode,
    vs: setup.videos.map(v => {
      const o = { u: v.url, t: v.title }
      if (v.artist) o.a = v.artist
      if (v.desc) o.d = v.desc
      if (v.rec) o.r = v.rec
      return o
    })
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
}

function decodeSetup(hash) {
  try {
    const json = decodeURIComponent(escape(atob(hash)))
    const data = JSON.parse(json)
    return {
      title: data.t,
      size: data.s,
      voterCount: data.v,
      playMode: data.p,
      videos: data.vs.map((v, i) => ({
        id: i, url: v.u, title: v.t, artist: v.a || '', desc: v.d || '', rec: v.r || '',
        videoId: ytId(v.u),
      }))
    }
  } catch { return null }
}

function getShareUrl(setup) {
  return window.location.origin + window.location.pathname + '#' + encodeSetup(setup)
}

/* ═══════════ SHARE BANNER ═══════════ */
function ShareBanner({ tournament }) {
  const [copied, setCopied] = useState(false)
  const link = getShareUrl(tournament)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { prompt('이 링크를 복사하세요:', link) }
  }

  return (
    <div className="share-banner">
      <div className="share-top">
        <span className="share-label">시연용 링크</span>
        <button className="btn btn-gold btn-sm" onClick={copy}>
          {copied ? '복사 완료!' : '링크 복사'}
        </button>
      </div>
      <p className="share-desc">이 링크를 공유하면 누구나 같은 월드컵을 플레이할 수 있습니다.</p>
    </div>
  )
}

/* ═══════════ CONFETTI ═══════════ */
function Confetti() {
  const colors = ['#C49B5A', '#E8D5B0', '#8B7355', '#D4AF37', '#F5E6CC']
  const p = useRef(Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100, color: colors[i % 5],
    w: 5 + Math.random() * 6, delay: Math.random() * 2.5, dur: 2.5 + Math.random() * 2,
  }))).current
  return (
    <div className="confetti-wrap">
      {p.map(x => <div key={x.id} className="confetti-piece" style={{
        left: x.left + '%', background: x.color, width: x.w, height: x.w * 1.6,
        borderRadius: Math.random() > 0.5 ? '50%' : '1px',
        animationDelay: x.delay + 's', animationDuration: x.dur + 's',
      }} />)}
    </div>
  )
}

/* ═══════════ MODAL ═══════════ */
function Modal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <p className="modal-msg">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn btn-gold" onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ BULK PASTE ═══════════ */
function BulkModal({ onApply, onClose }) {
  const [text, setText] = useState('')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">한번에 붙여넣기</h3>
        <p className="modal-hint">한 줄에 하나씩: URL / 제목 / 아티스트 / 소개 / 추천인</p>
        <p className="modal-hint" style={{ marginTop: -8 }}>URL만 넣어도 됩니다. 나머지는 나중에 채울 수 있어요.</p>
        <textarea className="modal-textarea" value={text} onChange={e => setText(e.target.value)}
          placeholder={"https://youtube.com/watch?v=abc / Bohemian Rhapsody / Queen / 기타 솔로 / 홍길동\nhttps://youtu.be/xyz / Hotel California / Eagles\nhttps://youtu.be/123"} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button className="btn btn-gold" onClick={() => {
            const lines = text.trim().split('\n').filter(Boolean)
            onApply(lines.map(l => {
              const p = l.split(' / ').map(s => s.trim())
              return { url: p[0]||'', title: p[1]||'', artist: p[2]||'', desc: p[3]||'', rec: p[4]||'' }
            }))
          }}>적용</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ BRACKET ═══════════ */
function BkEntry({ v, votes, win, lose }) {
  if (!v) return <div className="bk-entry bk-tbd"><span className="bk-name">—</span></div>
  return (
    <div className={`bk-entry ${win ? 'bk-win' : lose ? 'bk-lose' : ''}`}>
      {v.videoId && <img className="bk-thumb" src={thumb(v.videoId)} alt="" loading="lazy" />}
      <span className="bk-name">{v.title}{v.artist ? ` — ${v.artist}` : ''}</span>
      {votes != null && <span className="bk-votes">{votes}</span>}
    </div>
  )
}

function Bracket({ matches, videos, config }) {
  const fv = v => v ? videos.find(x => x.id === v.id) : null
  return (
    <div className="bracket">
      {config.rounds.map((name, ri) => (
        <div className="bk-round" key={ri}>
          <div className="bk-round-name">{name}</div>
          <div className="bk-grid">
            {matches.slice(config.bounds[ri], config.bounds[ri + 1]).map(m => {
              const a = fv(m.v1), b = fv(m.v2)
              return (
                <div className="bk-match" key={m.id}>
                  <BkEntry v={a} votes={m.winner != null ? m.s1 : null} win={m.winner === a?.id} lose={m.winner != null && m.winner !== a?.id} />
                  <div className="bk-div" />
                  <BkEntry v={b} votes={m.winner != null ? m.s2 : null} win={m.winner === b?.id} lose={m.winner != null && m.winner !== b?.id} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════ SETUP ═══════════ */
function Setup({ onStart }) {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState(16)
  const [vc, setVc] = useState(1)
  const [playMode, setPlayMode] = useState('inline')
  const [entries, setEntries] = useState(Array.from({ length: 16 }, () => ({ url: '', title: '', artist: '', desc: '', rec: '' })))
  const [showBulk, setShowBulk] = useState(false)

  const visible = entries.slice(0, size)
  const upd = (i, f, v) => setEntries(p => { const n = [...p]; n[i] = { ...n[i], [f]: v }; return n })
  const filled = visible.filter(e => e.url && ytId(e.url) && e.title.trim()).length
  const ok = title.trim() && filled === size

  return (
    <div>
      <header className="hd">
        <span className="hd-tag">Video World Cup</span>
        <h1 className="hd-title">Create Your<br />World Cup</h1>
      </header>

      <div className="setup-section">
        <label className="label">Title</label>
        <input className="input-underline input-lg" placeholder="최고의 기타 솔로 월드컵"
          value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="setup-row">
        <div className="setup-field">
          <label className="label">라운드</label>
          <select className="input-box" value={size} onChange={e => setSize(+e.target.value)}>
            <option value={16}>16강부터</option>
            <option value={8}>8강부터</option>
          </select>
        </div>
        <div className="setup-field">
          <label className="label">투표 인원</label>
          <input type="number" className="input-box" min={1} max={20} value={vc}
            onChange={e => setVc(Math.max(1, Math.min(20, +e.target.value || 1)))} />
        </div>
        <div className="setup-field">
          <label className="label">영상 재생</label>
          <select className="input-box" value={playMode} onChange={e => setPlayMode(e.target.value)}>
            <option value="inline">페이지 내 재생</option>
            <option value="outlink">유튜브 이동</option>
          </select>
        </div>
      </div>

      <div className="entry-bar">
        <span className="entry-count"><em className={filled === size ? 'is-done' : ''}>{filled}</em>/{size}</span>
        <div className="entry-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(true)}>붙여넣기</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEntries(prev => {
            const top = shuffle(prev.slice(0, size))
            return [...top, ...prev.slice(size)]
          })}>셔플</button>
        </div>
      </div>

      {/* column headers */}
      <div className="entry-header">
        <div />
        <div className="entry-header-fields">
          <span>URL</span><span>제목</span><span>아티스트</span><span>소개</span><span>추천인</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, textAlign: 'center' }}>미리보기</span>
      </div>

      <div className="entry-list">
        {visible.map((e, i) => {
          const vid = ytId(e.url)
          return (
            <div className={`entry ${vid && e.title ? 'is-filled' : ''}`} key={i}>
              <span className="entry-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="entry-fields">
                <input placeholder="youtube.com/..." value={e.url} onChange={ev => upd(i, 'url', ev.target.value)} />
                <input placeholder="필수" value={e.title} onChange={ev => upd(i, 'title', ev.target.value)} />
                <input placeholder="선택" value={e.artist} onChange={ev => upd(i, 'artist', ev.target.value)} />
                <input placeholder="선택" value={e.desc} onChange={ev => upd(i, 'desc', ev.target.value)} />
                <input className="entry-rec" placeholder="선택" value={e.rec} onChange={ev => upd(i, 'rec', ev.target.value)} />
              </div>
              <div className="entry-thumb">
                {vid ? <img src={thumb(vid)} alt="" /> : <span>—</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cta-row">
        <button className="btn btn-gold btn-lg" disabled={!ok} onClick={() => {
          const vids = visible.map((e, i) => ({
            id: i, url: e.url, title: e.title.trim(), artist: e.artist.trim(),
            desc: e.desc, rec: e.rec, videoId: ytId(e.url),
          }))
          onStart({ title: title.trim(), videos: vids, voterCount: vc, playMode, size })
        }}>
          {ok ? 'Start World Cup' : `${size - filled}개 더 등록`}
        </button>
      </div>

      {showBulk && <BulkModal onApply={parsed => {
        setEntries(prev => {
          const next = [...prev]
          parsed.forEach((p, i) => { if (i < size) next[i] = { ...next[i], ...p } })
          return next
        })
        setShowBulk(false)
      }} onClose={() => setShowBulk(false)} />}
    </div>
  )
}

/* ═══════════ MATCH CARD ═══════════ */
function Card({ video, count, revealed, isWin, isLose, onVote, disabled, playMode, showTurn, voterCount, total }) {
  const [playing, setPlaying] = useState(false)
  const vid = video?.videoId
  useEffect(() => { setPlaying(false) }, [video?.id])

  return (
    <div className={`card ${revealed ? (isWin ? 'card-win' : isLose ? 'card-lose' : '') : ''}`}>
      {playing && vid ? (
        <div className="card-embed"><iframe src={embedUrl(vid)} allow="autoplay; encrypted-media" allowFullScreen /></div>
      ) : (
        <div className="card-media" onClick={() => {
          if (!vid) return
          if (playMode === 'outlink') window.open(ytUrl(vid), '_blank')
          else setPlaying(true)
        }}>
          {vid ? (
            <>
              <img src={thumb(vid)} alt={video?.title || ''} />
              <div className="card-play"><svg viewBox="0 0 24 24"><polygon points="8,5 20,12 8,19" /></svg></div>
            </>
          ) : <span className="card-empty">No Preview</span>}
        </div>
      )}
      <div className="card-info">
        <h3 className="card-title">{video?.title || '—'}</h3>
        {video?.artist && <p className="card-artist">{video.artist}</p>}
        {video?.desc && <p className="card-desc">{video.desc}</p>}
        {video?.rec && <p className="card-rec">{video.rec}</p>}
      </div>
      {revealed ? (
        <div className="card-result">
          <span className={`result-count ${isWin ? 'is-win' : ''}`}>{count}</span>
          {isWin && <span className="result-label">Winner</span>}
        </div>
      ) : (
        <div className="card-action">
          {showTurn ? (
            <div className="vote-done">투표 완료 · {total}/{voterCount}</div>
          ) : (
            <button className="vote-btn" onClick={onVote} disabled={disabled}>Vote</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════ MATCH SCREEN ═══════════ */
function MatchScreen({ tournament, onAdvance, onReset }) {
  const { matches, currentMatch: ci, voterCount, playMode, size } = tournament
  const config = getConfig(size || 16)
  const match = matches[ci]

  const [s1, setS1] = useState(0)
  const [s2, setS2] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [justVoted, setJustVoted] = useState(null)
  const [voteLock, setVoteLock] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setS1(0); setS2(0); setRevealed(false); setJustVoted(null); setVoteLock(false)
  }, [ci])

  const total = s1 + s2
  const allIn = total >= voterCount

  useEffect(() => {
    if (allIn && !revealed) {
      const t = setTimeout(() => setRevealed(true), voterCount > 1 ? 800 : 400)
      return () => clearTimeout(t)
    }
  }, [allIn, revealed, voterCount])

  const castVote = (side) => {
    if (voteLock || allIn) return
    setVoteLock(true)
    setJustVoted(side)
    if (side === 1) setS1(p => p + 1); else setS2(p => p + 1)
    setTimeout(() => { setJustVoted(null); setVoteLock(false) }, voterCount > 1 ? 900 : 200)
  }

  // keyboard shortcuts: ← for left, → for right
  useEffect(() => {
    const handler = (e) => {
      if (revealed || voteLock || allIn) return
      if (e.key === 'ArrowLeft' || e.key === '1') castVote(1)
      if (e.key === 'ArrowRight' || e.key === '2') castVote(2)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const isTie = revealed && s1 === s2
  const winner = s1 > s2 ? 1 : s1 < s2 ? 2 : null

  const ri = getRound(ci, config.bounds)
  const rStart = config.bounds[ri]
  const rEnd = config.bounds[ri + 1]
  const showTurn = voterCount > 1 && !revealed && justVoted !== null

  return (
    <div>
      <header className="hd">
        <span className="hd-tag">Video World Cup</span>
        <h1 className="hd-title-sm">{tournament.title}</h1>
        <button className="hd-reset" onClick={() => setConfirmReset(true)}>Exit</button>
      </header>

      <ShareBanner tournament={tournament} />

      <div className="round-hd">
        <span className="round-label">Round</span>
        <h2 className="round-name">{config.rounds[ri]}</h2>
        <span className="round-sub">Match {ci - rStart + 1} of {rEnd - rStart}</span>
      </div>

      <div className="progress"><div className="progress-bar" style={{ width: ((ci + 1) / config.total) * 100 + '%' }} /></div>

      {voterCount > 1 && (
        <div className="vote-info">
          <span>{total}<em>/{voterCount}</em> voted</span>
          {!allIn && total > 0 && !revealed && !justVoted && (
            <button className="btn btn-ghost btn-sm" onClick={() => setRevealed(true)}>마감</button>
          )}
        </div>
      )}

      <div className="match-grid">
        <Card video={match.v1} count={s1} revealed={revealed}
          isWin={revealed && winner === 1} isLose={revealed && winner === 2}
          onVote={() => castVote(1)} disabled={voteLock || allIn}
          playMode={playMode} showTurn={showTurn} voterCount={voterCount} total={total} />
        <div className="vs"><span>VS</span></div>
        <Card video={match.v2} count={s2} revealed={revealed}
          isWin={revealed && winner === 2} isLose={revealed && winner === 1}
          onVote={() => castVote(2)} disabled={voteLock || allIn}
          playMode={playMode} showTurn={showTurn} voterCount={voterCount} total={total} />
      </div>

      {isTie && (
        <div className="match-cta">
          <p className="tie-msg">동점 — 재투표가 필요합니다</p>
          <button className="btn btn-gold" onClick={() => {
            setS1(0); setS2(0); setRevealed(false); setJustVoted(null); setVoteLock(false)
          }}>Revote</button>
        </div>
      )}

      {revealed && !isTie && (
        <div className="match-cta">
          <button className="btn btn-gold btn-lg" onClick={() => {
            onAdvance(ci, winner === 1 ? match.v1?.id : match.v2?.id, s1, s2)
          }}>
            {ci === config.total - 1 ? 'Final Result' : ci + 1 === rEnd ? `${config.rounds[ri + 1]} →` : 'Next Match →'}
          </button>
        </div>
      )}

      {confirmReset && (
        <Modal message="월드컵을 초기화할까요?" onConfirm={() => { setConfirmReset(false); onReset() }} onCancel={() => setConfirmReset(false)} />
      )}
    </div>
  )
}

/* ═══════════ TRANSITION ═══════════ */
function Transition({ tournament, onContinue, onReset }) {
  const config = getConfig(tournament.size || 16)
  const nr = tournament.nextRound || 1
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div>
      <div className="trans">
        <button className="hd-reset" style={{ position: 'absolute', top: 24, right: 24 }}
          onClick={() => setConfirmReset(true)}>Exit</button>
        <span className="trans-label">Next Round</span>
        <h2 className="trans-name">{config.rounds[nr]}</h2>
        <button className="btn btn-gold btn-lg" onClick={onContinue}>Continue →</button>
      </div>
      <hr className="rule" />
      <Bracket matches={tournament.matches} videos={tournament.videos} config={config} />
      {confirmReset && (
        <Modal message="월드컵을 초기화할까요?" onConfirm={() => { setConfirmReset(false); onReset() }} onCancel={() => setConfirmReset(false)} />
      )}
    </div>
  )
}

/* ═══════════ RESULT ═══════════ */
function Result({ winner, tournament, onReset }) {
  const vid = winner?.videoId
  const config = getConfig(tournament.size || 16)
  return (
    <div>
      <Confetti />
      <div className="result">
        <span className="result-tag">Champion</span>
        <h2 className="result-title">{winner?.title}</h2>
        {winner?.artist && <p className="result-artist">{winner.artist}</p>}
        {winner?.desc && <p className="result-desc">{winner.desc}</p>}
        {winner?.rec && <p className="result-rec">Picked by {winner.rec}</p>}
        {vid && <img className="result-hero" src={thumb(vid)} alt={winner.title} />}
        <div className="cta-row">
          {vid && <button className="btn btn-ghost" onClick={() => window.open(ytUrl(vid), '_blank')}>Watch on YouTube</button>}
          <button className="btn btn-gold" onClick={onReset}>New World Cup</button>
        </div>
      </div>
      <hr className="rule" />
      <h3 className="section-label">Full Bracket</h3>
      <Bracket matches={tournament.matches} videos={tournament.videos} config={config} />
    </div>
  )
}

/* ═══════════════════════════════════
   APP
   ═══════════════════════════════════ */
export default function App() {
  const [tournament, setTournament] = useState(() => {
    // Priority 1: URL hash (shared link)
    const hash = window.location.hash.slice(1)
    if (hash) {
      const setup = decodeSetup(hash)
      if (setup) {
        // Clear hash so refresh uses localStorage instead of resetting
        history.replaceState(null, '', window.location.pathname)
        const config = getConfig(setup.size)
        const t = {
          ...setup,
          matches: buildMatches(setup.videos, config.total),
          currentMatch: 0, phase: 'match', nextRound: 1,
        }
        save(t)
        return t
      }
    }
    // Priority 2: localStorage (resume)
    return load()
  })

  const persist = (t) => { setTournament(t); save(t) }

  const handleStart = ({ title, videos, voterCount, playMode, size }) => {
    const config = getConfig(size)
    persist({
      title, videos, voterCount, playMode, size,
      matches: buildMatches(videos, config.total),
      currentMatch: 0, phase: 'match', nextRound: 1,
    })
  }

  const handleAdvance = (mi, winnerId, s1, s2) => {
    const config = getConfig(tournament.size || 16)
    const ms = [...tournament.matches]
    ms[mi] = { ...ms[mi], winner: winnerId, s1, s2 }

    const ns = nextSlot(mi, config.bounds)
    if (ns) {
      const wv = ms[mi].v1?.id === winnerId ? ms[mi].v1 : ms[mi].v2
      ms[ns.idx] = { ...ms[ns.idx] }
      if (ns.slot === 0) ms[ns.idx].v1 = wv; else ms[ns.idx].v2 = wv
    }

    const ri = getRound(mi, config.bounds)
    const rEnd = config.bounds[ri + 1]

    if (mi === config.total - 1) persist({ ...tournament, matches: ms, phase: 'result', currentMatch: mi })
    else if (mi + 1 === rEnd) persist({ ...tournament, matches: ms, phase: 'transition', currentMatch: mi + 1, nextRound: ri + 1 })
    else persist({ ...tournament, matches: ms, currentMatch: mi + 1 })
  }

  const handleContinue = () => persist({ ...tournament, phase: 'match' })
  const handleReset = () => {
    setTournament(null)
    clear()
    // clear URL hash
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }

  const phase = tournament?.phase
  const config = tournament ? getConfig(tournament.size || 16) : null
  const lastIdx = config ? config.total - 1 : 14
  const finalWinner = phase === 'result' && tournament.matches[lastIdx]?.winner != null
    ? tournament.videos.find(v => v.id === tournament.matches[lastIdx].winner) : null

  return (
    <div className="app">
      {!tournament && <Setup onStart={handleStart} />}
      {phase === 'match' && <MatchScreen tournament={tournament} onAdvance={handleAdvance} onReset={handleReset} />}
      {phase === 'transition' && <Transition tournament={tournament} onContinue={handleContinue} onReset={handleReset} />}
      {phase === 'result' && finalWinner && <Result winner={finalWinner} tournament={tournament} onReset={handleReset} />}
    </div>
  )
}
