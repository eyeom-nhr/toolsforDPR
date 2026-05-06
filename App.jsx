import { useState, useEffect, useRef } from 'react'
import { db } from './firebaseConfig'
import { ref, set, onValue, remove } from 'firebase/database'

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
  if (size === 8) return {
    rounds: ['8강', '4강', '결승'],
    bounds: [0, 4, 6, 7],
    total: 7, entryCount: 8,
  }
  return {
    rounds: ['16강', '8강', '4강', '결승'],
    bounds: [0, 8, 12, 14, 15],
    total: 15, entryCount: 16,
  }
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
  const firstRound = vids.length / 2
  return Array.from({ length: totalMatches }, (_, i) => ({
    id: i,
    v1: i < firstRound ? vids[i * 2] : null,
    v2: i < firstRound ? vids[i * 2 + 1] : null,
    winner: null, s1: 0, s2: 0,
  }))
}

/* ═══════════ USER ID ═══════════ */
function getUserId() {
  let id = localStorage.getItem('vwc_uid')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('vwc_uid', id)
  }
  return id
}

/* ═══════════ FIREBASE ═══════════ */
const fbSet = async (path, val) => { try { await set(ref(db, path), val) } catch (e) { console.error(e) } }
const fbRemove = async (path) => { try { await remove(ref(db, path)) } catch (e) { console.error(e) } }

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
  const parse = () => {
    const lines = text.trim().split('\n').filter(Boolean)
    onApply(lines.map(line => {
      const p = line.split('|').map(s => s.trim())
      return { url: p[0] || '', title: p[1] || '', artist: p[2] || '', desc: p[3] || '', rec: p[4] || '' }
    }))
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">한번에 붙여넣기</h3>
        <p className="modal-hint">한 줄에 하나씩: URL | 제목 | 아티스트 | 소개 | 추천인</p>
        <textarea className="modal-textarea" value={text} onChange={e => setText(e.target.value)}
          placeholder={"https://youtube.com/watch?v=abc | Bohemian Rhapsody | Queen | 전설의 기타 솔로 | 홍길동\nhttps://youtu.be/xyz | Hotel California | Eagles"} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button className="btn btn-gold" onClick={parse}>적용</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ SHARE LINK BANNER ═══════════ */
function ShareBanner() {
  const [copied, setCopied] = useState(false)
  const link = window.location.origin + window.location.pathname

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('이 링크를 복사하세요:', link)
    }
  }

  return (
    <div className="share-banner">
      <span className="share-text">참여자들에게 아래 링크를 공유하세요</span>
      <div className="share-row">
        <code className="share-link">{link}</code>
        <button className="btn btn-gold btn-sm" onClick={copy}>
          {copied ? '복사됨!' : '링크 복사'}
        </button>
      </div>
    </div>
  )
}

/* ═══════════ BRACKET ═══════════ */
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

/* ═══════════ SETUP ═══════════ */
function Setup({ onStart }) {
  const [title, setTitle] = useState('')
  const [size, setSize] = useState(16)
  const [vc, setVc] = useState(4)
  const [playMode, setPlayMode] = useState('inline')
  const [entries, setEntries] = useState(Array.from({ length: 16 }, () => ({ url: '', title: '', artist: '', desc: '', rec: '' })))
  const [showBulk, setShowBulk] = useState(false)

  const visibleEntries = entries.slice(0, size)
  const upd = (i, f, v) => setEntries(p => { const n = [...p]; n[i] = { ...n[i], [f]: v }; return n })
  const filled = visibleEntries.filter(e => e.url && ytId(e.url) && e.title.trim()).length
  const ok = title.trim() && filled === size

  const applyBulk = parsed => {
    setEntries(prev => {
      const next = [...prev]
      parsed.forEach((p, i) => { if (i < size) next[i] = { ...next[i], ...p } })
      return next
    })
    setShowBulk(false)
  }

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
          <input type="number" className="input-box" min={1} max={30} value={vc}
            onChange={e => setVc(Math.max(1, Math.min(30, +e.target.value || 1)))} />
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

      <div className="entry-list">
        {visibleEntries.map((e, i) => {
          const vid = ytId(e.url)
          return (
            <div className={`entry ${vid && e.title ? 'is-filled' : ''}`} key={i}>
              <span className="entry-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="entry-fields">
                <input placeholder="YouTube URL" value={e.url} onChange={ev => upd(i, 'url', ev.target.value)} />
                <input placeholder="제목 *" value={e.title} onChange={ev => upd(i, 'title', ev.target.value)} />
                <input placeholder="아티스트" value={e.artist} onChange={ev => upd(i, 'artist', ev.target.value)} />
                <input placeholder="한줄 소개" value={e.desc} onChange={ev => upd(i, 'desc', ev.target.value)} />
                <input className="entry-rec" placeholder="추천인" value={e.rec} onChange={ev => upd(i, 'rec', ev.target.value)} />
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
          const vids = visibleEntries.map((e, i) => ({
            id: i, url: e.url, title: e.title.trim(), artist: e.artist.trim(),
            desc: e.desc, rec: e.rec, videoId: ytId(e.url),
          }))
          onStart({ title: title.trim(), videos: vids, voterCount: vc, playMode, size })
        }}>
          {ok ? 'Start World Cup' : `${size - filled}개 더 등록`}
        </button>
      </div>

      {showBulk && <BulkModal onApply={applyBulk} onClose={() => setShowBulk(false)} />}
    </div>
  )
}

/* ═══════════ MATCH CARD ═══════════ */
function Card({ video, myVoted, count, total, revealed, isWin, isLose, onVote, locked, playMode, voterCount }) {
  const [playing, setPlaying] = useState(false)
  const vid = video?.videoId
  const handleMedia = () => {
    if (!vid) return
    if (playMode === 'outlink') window.open(ytUrl(vid), '_blank')
    else setPlaying(true)
  }
  useEffect(() => { setPlaying(false) }, [video?.id])

  return (
    <div className={`card ${revealed ? (isWin ? 'card-win' : isLose ? 'card-lose' : '') : ''}`}>
      {playing && vid ? (
        <div className="card-embed"><iframe src={embedUrl(vid)} allow="autoplay; encrypted-media" allowFullScreen /></div>
      ) : (
        <div className="card-media" onClick={handleMedia}>
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
          {myVoted ? (
            <div className="vote-done">투표 완료 · {total}/{voterCount}</div>
          ) : (
            <button className="vote-btn" onClick={onVote} disabled={locked}>Vote</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════ MATCH SCREEN ═══════════ */
function MatchScreen({ tournament, uid, isHost, onAdvance, onReset }) {
  const { matches, currentMatch: ci, title: tTitle, voterCount, playMode, size } = tournament
  const config = getConfig(size || 16)
  const match = matches[ci]

  const [votes, setVotes] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setRevealed(false)
    const unsub = onValue(ref(db, `votes/match_${ci}`), snap => setVotes(snap.val() || {}))
    return () => unsub()
  }, [ci])

  const myVote = votes[uid] || null
  const voters = Object.keys(votes)
  const cnt1 = voters.filter(k => votes[k] === match.v1?.id).length
  const cnt2 = voters.filter(k => votes[k] === match.v2?.id).length
  const total = voters.length
  const allIn = total >= voterCount

  useEffect(() => {
    if (allIn && !revealed) {
      const t = setTimeout(() => setRevealed(true), 800)
      return () => clearTimeout(t)
    }
  }, [allIn, revealed])

  const castVote = async (videoId) => {
    if (myVote) return
    await fbSet(`votes/match_${ci}/${uid}`, videoId)
  }

  const isTie = revealed && cnt1 === cnt2
  const winner = cnt1 > cnt2 ? 1 : cnt1 < cnt2 ? 2 : null

  const ri = getRound(ci, config.bounds)
  const rStart = config.bounds[ri]
  const rEnd = config.bounds[ri + 1]

  return (
    <div>
      <header className="hd">
        <span className="hd-tag">Video World Cup</span>
        <h1 className="hd-title-sm">{tTitle}</h1>
        {isHost && <button className="hd-reset" onClick={() => setConfirmReset(true)}>Exit</button>}
      </header>

      {isHost && <ShareBanner />}

      <div className="round-hd">
        <span className="round-label">Round</span>
        <h2 className="round-name">{config.rounds[ri]}</h2>
        <span className="round-sub">Match {ci - rStart + 1} of {rEnd - rStart}</span>
      </div>

      <div className="progress"><div className="progress-bar" style={{ width: ((ci + 1) / config.total) * 100 + '%' }} /></div>

      <div className="vote-info">
        <span>{total}<em>/{voterCount}</em> voted</span>
        {isHost && !allIn && total > 0 && !revealed && (
          <button className="btn btn-ghost btn-sm" onClick={() => setRevealed(true)}>마감</button>
        )}
      </div>

      <div className="match-grid">
        <Card video={match.v1} myVoted={myVote === match.v1?.id} count={cnt1} total={total}
          revealed={revealed} isWin={revealed && winner === 1} isLose={revealed && winner === 2}
          onVote={() => castVote(match.v1?.id)} locked={!!myVote || allIn}
          playMode={playMode} voterCount={voterCount} />
        <div className="vs"><span>VS</span></div>
        <Card video={match.v2} myVoted={myVote === match.v2?.id} count={cnt2} total={total}
          revealed={revealed} isWin={revealed && winner === 2} isLose={revealed && winner === 1}
          onVote={() => castVote(match.v2?.id)} locked={!!myVote || allIn}
          playMode={playMode} voterCount={voterCount} />
      </div>

      {isTie && isHost && (
        <div className="match-cta">
          <p className="tie-msg">동점 — 재투표가 필요합니다</p>
          <button className="btn btn-gold" onClick={async () => { setRevealed(false); await fbRemove(`votes/match_${ci}`) }}>Revote</button>
        </div>
      )}
      {isTie && !isHost && (
        <div className="match-cta"><p className="tie-msg">동점 — 호스트가 재투표를 시작합니다</p></div>
      )}

      {revealed && !isTie && isHost && (
        <div className="match-cta">
          <button className="btn btn-gold btn-lg" onClick={async () => {
            const wId = winner === 1 ? match.v1?.id : match.v2?.id
            await fbRemove(`votes/match_${ci}`)
            onAdvance(ci, wId, cnt1, cnt2)
          }}>
            {ci === config.total - 1 ? 'Final Result' : ci + 1 === rEnd ? `${config.rounds[ri + 1]} →` : 'Next Match →'}
          </button>
        </div>
      )}
      {revealed && !isTie && !isHost && (
        <div className="match-cta"><p style={{ color: 'var(--tx3)', fontSize: 13 }}>호스트가 다음 경기를 진행합니다</p></div>
      )}

      {confirmReset && (
        <Modal message="월드컵을 초기화할까요?" onConfirm={() => { setConfirmReset(false); onReset() }} onCancel={() => setConfirmReset(false)} />
      )}
    </div>
  )
}

/* ═══════════ TRANSITION ═══════════ */
function Transition({ tournament, isHost, onContinue }) {
  const config = getConfig(tournament.size || 16)
  const nr = tournament.nextRound || 1
  return (
    <div>
      <div className="trans">
        <span className="trans-label">Next Round</span>
        <h2 className="trans-name">{config.rounds[nr]}</h2>
        {isHost
          ? <button className="btn btn-gold btn-lg" onClick={onContinue}>Continue →</button>
          : <p style={{ color: 'var(--tx3)', fontSize: 13 }}>호스트가 다음 라운드를 시작합니다</p>}
      </div>
      <hr className="rule" />
      <Bracket matches={tournament.matches} videos={tournament.videos} config={config} />
    </div>
  )
}

/* ═══════════ RESULT ═══════════ */
function Result({ winner, tournament, isHost, onReset }) {
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
          {isHost && <button className="btn btn-gold" onClick={onReset}>New World Cup</button>}
        </div>
      </div>
      <hr className="rule" />
      <h3 className="section-label">Full Bracket</h3>
      <Bracket matches={tournament.matches} videos={tournament.videos} config={config} />
    </div>
  )
}

/* ═══════════ WAITING SCREEN (for non-hosts) ═══════════ */
function Waiting() {
  return (
    <div className="waiting">
      <span className="hd-tag">Video World Cup</span>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginTop: 12 }}>월드컵 준비 중</h2>
      <p style={{ color: 'var(--tx3)', marginTop: 8, fontSize: 14 }}>호스트가 월드컵을 만들고 있습니다.<br />잠시만 기다려주세요.</p>
      <div className="spinner" style={{ marginTop: 24 }} />
    </div>
  )
}

/* ═══════════════════════════════════
   APP
   ═══════════════════════════════════ */
export default function App() {
  const [tournament, setTournament] = useState(null)
  const [ready, setReady] = useState(false)
  const uid = useRef(getUserId()).current

  // Listen to tournament state
  useEffect(() => {
    const unsub = onValue(ref(db, 'tournament'), snap => {
      setTournament(snap.val() || null)
      setReady(true)
    })
    return () => unsub()
  }, [])

  const isHost = tournament ? tournament.hostId === uid : true

  const saveTournament = async (t) => {
    setTournament(t)
    await fbSet('tournament', t)
  }

  const handleStart = async ({ title, videos, voterCount, playMode, size }) => {
    await fbRemove('votes')
    const config = getConfig(size)
    await saveTournament({
      title, videos, voterCount, playMode, size,
      matches: buildMatches(videos, config.total),
      currentMatch: 0, phase: 'match', nextRound: 1,
      hostId: uid,
    })
  }

  const handleAdvance = async (mi, winnerId, s1, s2) => {
    const config = getConfig(tournament.size || 16)
    const ms = [...tournament.matches]
    ms[mi] = { ...ms[mi], winner: winnerId, s1, s2 }

    const ns = nextSlot(mi, config.bounds)
    if (ns) {
      const wv = ms[mi].v1?.id === winnerId ? ms[mi].v1 : ms[mi].v2
      ms[ns.idx] = { ...ms[ns.idx] }
      if (ns.slot === 0) ms[ns.idx].v1 = wv
      else ms[ns.idx].v2 = wv
    }

    const ri = getRound(mi, config.bounds)
    const rEnd = config.bounds[ri + 1]

    if (mi === config.total - 1) {
      await saveTournament({ ...tournament, matches: ms, phase: 'result', currentMatch: mi })
    } else if (mi + 1 === rEnd) {
      await saveTournament({ ...tournament, matches: ms, phase: 'transition', currentMatch: mi + 1, nextRound: ri + 1 })
    } else {
      await saveTournament({ ...tournament, matches: ms, currentMatch: mi + 1 })
    }
  }

  const handleContinue = async () => await saveTournament({ ...tournament, phase: 'match' })

  const handleReset = async () => {
    await fbRemove('tournament')
    await fbRemove('votes')
    setTournament(null)
  }

  if (!ready) return <div className="app"><div className="loading"><div className="spinner" />Loading</div></div>

  const phase = tournament?.phase
  const lastMatchIdx = tournament ? getConfig(tournament.size || 16).total - 1 : 14
  const finalWinner = phase === 'result' && tournament.matches[lastMatchIdx]?.winner != null
    ? tournament.videos.find(v => v.id === tournament.matches[lastMatchIdx].winner) : null

  return (
    <div className="app">
      {!tournament && isHost && <Setup onStart={handleStart} />}
      {!tournament && !isHost && <Waiting />}
      {phase === 'match' && <MatchScreen tournament={tournament} uid={uid} isHost={isHost} onAdvance={handleAdvance} onReset={handleReset} />}
      {phase === 'transition' && <Transition tournament={tournament} isHost={isHost} onContinue={handleContinue} />}
      {phase === 'result' && finalWinner && <Result winner={finalWinner} tournament={tournament} isHost={isHost} onReset={handleReset} />}
    </div>
  )
}
