// ouroboros-lib.js — factory + utilitários alinhados ao SVG documentado
//
// estrutura oficial do svg (segundo os <title> dos elementos):
//   #inner-detail             grupo (contas_internas)
//     #bolinhas-internas      anel pontilhado interno
//   #snake                    grupo (contras_externas) — contém as 43 contas
//     circle#conta-01 .. #conta-43   as contas do corpo
//   #wordmark                 grupo (Palavras)
//     #wordmark-protocolo, #wordmark-ouroboros
//   <g> (Elementos_Principais)  grupo do rosto (sem id, o último no svg)
//     #head-focinho    → CAUDA (o rabo que entra na boca)
//     #head-coroa      → CABEÇA (a coroa em cima)
//     #eye             → OLHO
//     #lingua          → BOCA (que morde a cauda)
//
// api.rosto agrupa cabeça+cauda+boca+olho como quatro elementos manipuláveis em conjunto.
(function () {
  var cache = null,
    promise = null;

  function fetchSVG() {
    if (cache) return Promise.resolve(cache);
    if (promise) return promise;
    promise = fetch('./ouroboros.svg')
      .then(function (r) {
        return r.text();
      })
      .then(function (t) {
        var d = document.createElement('div');
        d.innerHTML = t;
        cache = d.querySelector('svg');
        return cache;
      });
    return promise;
  }

  function create(container, opts) {
    opts = opts || {};
    return fetchSVG().then(function (src) {
      var s = src.cloneNode(true);
      s.removeAttribute('width');
      s.removeAttribute('height');
      s.style.display = 'block';
      s.style.width = '100%';
      s.style.height = '100%';
      s.style.overflow = 'visible';

      // referências (podem ser null se removidas ou ausentes)
      var refs = {
        cabeca: s.querySelector('#head-coroa'),
        cauda: s.querySelector('#head-focinho'),
        olho: s.querySelector('#eye'),
        boca: s.querySelector('#lingua'),
        snake: s.querySelector('#snake'),
        ring: s.querySelector('#bolinhas-internas'),
        innerDetail: s.querySelector('#inner-detail'),
        wordmark: s.querySelector('#wordmark'),
      };

      if (opts.hideBeads && refs.snake) {
        var contasEls = refs.snake.querySelectorAll('circle');
        for (var ci = 0; ci < contasEls.length; ci++) contasEls[ci].remove();
      }
      if (opts.hideRosto) {
        ['cabeca', 'cauda', 'olho', 'boca'].forEach(function (k) {
          if (refs[k]) {
            refs[k].remove();
            refs[k] = null;
          }
        });
      }
      if (opts.hideRing && refs.ring) {
        refs.ring.remove();
        refs.ring = null;
      }
      if (opts.hideWordmark && refs.wordmark) {
        refs.wordmark.remove();
        refs.wordmark = null;
      }

      container.appendChild(s);

      var beads = refs.snake
        ? Array.prototype.slice.call(refs.snake.querySelectorAll('circle'))
        : [];
      var originalFills = beads.map(function (b) {
        return b.getAttribute('fill');
      });

      // rosto = array com os 4 elementos do "rosto" (para aplicar op/estilo em massa)
      var rosto = ['cabeca', 'cauda', 'olho', 'boca']
        .map(function (k) {
          return refs[k];
        })
        .filter(Boolean);

      // helper para ligar/desligar o rosto todo com uma chamada
      function setRosto(prop, value) {
        rosto.forEach(function (el) {
          el.style[prop] = value;
        });
      }

      return {
        svg: s,
        beads: beads,
        originalFills: originalFills,
        cabeca: refs.cabeca, // #head-coroa
        cauda: refs.cauda, // #head-focinho
        olho: refs.olho, // #eye
        boca: refs.boca, // #lingua
        snake: refs.snake,
        ring: refs.ring,
        wordmark: refs.wordmark,
        rosto: rosto,
        setRosto: setRosto,
      };
    });
  }

  // Ordena as contas ao redor do centro. Direção 'ccw' = anti-horário (pescoço→cauda)
  // Retorna array com conta-01 (pescoço) em [0] e conta-43 (perto da boca) em [N-1].
  function orderFromHead(beads, direction) {
    direction = direction || 'ccw';
    var CX = 158.91,
      CY = 159.84;
    var arr = beads.map(function (el) {
      var cx = +el.getAttribute('cx'),
        cy = +el.getAttribute('cy');
      return { el: el, a: Math.atan2(cy - CY, cx - CX) };
    });
    arr.sort(function (a, b) {
      return a.a - b.a;
    });
    var aHead = Math.atan2(41.39 - CY, 160.97 - CX);
    var best = 0,
      bt = 9e9;
    arr.forEach(function (o, i) {
      var d = Math.abs(o.a - aHead) % (2 * Math.PI);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d < bt) {
        bt = d;
        best = i;
      }
    });
    var rotated = arr
      .slice(best)
      .concat(arr.slice(0, best))
      .map(function (o) {
        return o.el;
      });
    return direction === 'ccw'
      ? [rotated[0]].concat(rotated.slice(1).reverse())
      : rotated;
  }

  window.OB = {
    create: create,
    orderFromHead: orderFromHead,
    fetchSVG: fetchSVG,
  };
})();
