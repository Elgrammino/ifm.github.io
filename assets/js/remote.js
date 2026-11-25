/* Public reads and authenticated organizer writes for Firebase Realtime Database. */
(function (root) {
  function remote(config, fetcher = fetch) {
    const databaseURL = String(config?.databaseURL || '').replace(/\/$/, '');
    const apiKey = String(config?.apiKey || '');
    const ready = /^https:\/\/[a-z0-9.-]+\.(?:firebasedatabase\.app|firebaseio\.com)$/.test(databaseURL) && !!apiKey;
    let idToken = '';
    let expires = 0;
    const url = () => databaseURL + '/s.json';
    const decode = data => typeof data === 'string' ? JSON.parse(data) : data;
    async function checked(response) {
      if (!response.ok) throw Error('HTTP ' + response.status);
      return response;
    }
    async function read() {
      if (!ready) throw Error('Remote storage is not configured');
      const response = await checked(await fetcher(url() + '?t=' + Date.now(), { cache: 'no-store' }));
      const data = await response.json();
      return decode(data);
    }
    async function login(email, password) {
      if (!ready) throw Error('Remote storage is not configured');
      const response = await checked(await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(apiKey), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      }));
      const data = await response.json();
      idToken = data.idToken;
      expires = Date.now() + Number(data.expiresIn || 3600) * 1000 - 60000;
      return data.localId;
    }
    function logout() { idToken = ''; expires = 0; }
    function signedIn() { return !!idToken && Date.now() < expires; }
    async function update(change) {
      if (!signedIn()) throw Error('Login required');
      const endpoint = url() + '?auth=' + encodeURIComponent(idToken);
      for (let attempt = 0; attempt < 3; attempt++) {
        const current = await checked(await fetcher(endpoint, { headers: { 'X-Firebase-ETag': 'true' }, cache: 'no-store' }));
        const etag = current.headers.get('ETag');
        if (!etag) throw Error('Database ETag missing');
        const existing = decode(await current.json());
        const next = change(existing);
        const response = await fetcher(endpoint, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'if-match': etag },
          body: JSON.stringify(next)
        });
        if (response.status === 412) continue;
        await checked(response);
        return next;
      }
      throw Error('Concurrent update; retry');
    }
    return { ready, read, login, logout, signedIn, update };
  }
  if (typeof module !== 'undefined') module.exports = remote;
  else root.IFM_REMOTE = remote;
})(globalThis);
