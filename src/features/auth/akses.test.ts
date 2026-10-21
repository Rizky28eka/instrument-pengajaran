import { describe, expect, it } from 'vitest'
import { rutePerStatus, tentukanStatusAkses, tujuanAman, type MasukanStatus, type Profil } from './akses'

const profil = (p: Partial<Profil> = {}): Profil => ({
  uid: 'u1', email: 'a@b.id', nama: 'A', schoolId: 's1', role: 'supervisor', status: 'active', ...p,
})
const dasar: MasukanStatus = { authSiap: true, userAda: true, emailTerverifikasi: true, profil: profil(), galatProfil: false }
const status = (p: Partial<MasukanStatus>) => tentukanStatusAkses({ ...dasar, ...p })

describe('tentukanStatusAkses', () => {
  it('memuat selama auth belum siap', () => {
    expect(status({ authSiap: false, userAda: false })).toBe('memuat')
  })
  it('anonim bila tidak ada user', () => {
    expect(status({ userAda: false, profil: undefined })).toBe('anonim')
  })
  it('belum verifikasi bila email belum terverifikasi, apa pun profilnya', () => {
    expect(status({ emailTerverifikasi: false })).toBe('belum-verifikasi')
    expect(status({ emailTerverifikasi: false, profil: null })).toBe('belum-verifikasi')
  })
  it('memuat selama profil belum terbaca', () => {
    expect(status({ profil: undefined })).toBe('memuat')
  })
  it('belum aktif bila terverifikasi tetapi belum punya profil (belum menebus undangan)', () => {
    expect(status({ profil: null })).toBe('belum-aktif')
  })
  it('dinonaktifkan bila status profil disabled', () => {
    expect(status({ profil: profil({ status: 'disabled' }) })).toBe('dinonaktifkan')
  })
  it('galat saat profil gagal dibaca (bukan dianggap belum punya akses)', () => {
    expect(status({ galatProfil: true, profil: undefined })).toBe('galat')
  })
  it('aktif hanya jika semua syarat terpenuhi', () => {
    expect(status({})).toBe('aktif')
    expect(status({ profil: profil({ role: 'admin' }) })).toBe('aktif')
  })
})

describe('tujuanAman', () => {
  it.each(['/dashboard', '/supervisi/abc?x=1'])('menerima %s', (v) => expect(tujuanAman(v)).toBe(v))
  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined, 42])(
    'menolak %j',
    (v) => expect(tujuanAman(v)).toBeNull(),
  )
})

describe('rutePerStatus', () => {
  it('mengarahkan tiap status ke halaman yang tepat', () => {
    expect(rutePerStatus('anonim')).toBe('/login')
    expect(rutePerStatus('belum-verifikasi')).toBe('/verifikasi-email')
    expect(rutePerStatus('belum-aktif')).toBe('/aktivasi')
    expect(rutePerStatus('dinonaktifkan')).toBe('/akses-ditolak')
  })
  it('aktif menuju tujuan semula bila aman, jika tidak ke dashboard', () => {
    expect(rutePerStatus('aktif', '/supervisi')).toBe('/supervisi')
    expect(rutePerStatus('aktif', '//evil.example')).toBe('/dashboard')
    expect(rutePerStatus('aktif')).toBe('/dashboard')
  })
  it('tidak mengarahkan ke mana pun selagi memuat atau galat', () => {
    expect(rutePerStatus('memuat')).toBeNull()
    expect(rutePerStatus('galat')).toBeNull()
  })
})
