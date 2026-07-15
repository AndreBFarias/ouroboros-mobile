class Component extends DCLogic {
  componentDidMount() {
    var self = this;
    var tries = 0;
    (function waitForOB() {
      if (window.OB) return self._boot();
      if (++tries > 60) {
        console.error('OB não carregou');
        return;
      }
      setTimeout(waitForOB, 60);
    })();
  }

  componentDidUpdate() {
    // QUALQUER update re-renderiza o template e apaga os demos montados
    // (era isso que fazia o tweak reduzirMovimento "travar" a página) —
    // então sempre re-inicializa, com debounce. _boot é idempotente.
    if (!window.OB) return;
    var self = this;
    clearTimeout(this._rebootT);
    this._rebootT = setTimeout(function () {
      self._boot();
    }, 60);
  }

  // ============================================================
  // BOOT — idempotente: pode rodar de novo (hot-reload / tweaks)
  // sem deixar timer órfão. loops antigos morrem via isConnected
  // porque el.innerHTML = '' derruba o svg da rodada anterior.
  // ============================================================
  _boot() {
    var self = this;
    // constantes de geometria — um lugar só
    this.CENTER = '158.91px 159.84px'; // centro geométrico do logo (user units)
    this.RING_CENTER = '160.91px 159.84px'; // centro REAL do anel pontilhado — evita wobble
    this.REDUCED =
      !!(this.props && this.props.reduzirMovimento) ||
      (window.matchMedia
        ? matchMedia('(prefers-reduced-motion: reduce)').matches
        : false);
    var pause = this.props ? this.props.pausarForaDoViewport : true;
    this.PAUSE_OFFSCREEN = pause == null ? true : !!pause;

    // observer compartilhado — rAF/sparks dormem fora do viewport (18 demos na página)
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    if (this.PAUSE_OFFSCREEN && window.IntersectionObserver) {
      this._io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            en.target.__obVisible = en.isIntersecting;
          });
        },
        { rootMargin: '120px' }
      );
    }

    var els = Array.prototype.slice.call(
      document.querySelectorAll('[data-demo]')
    );
    els.forEach(function (el) {
      if (!el.getAttribute('data-base-style')) {
        el.setAttribute('data-base-style', el.getAttribute('style') || '');
      } else {
        el.setAttribute('style', el.getAttribute('data-base-style'));
      }
      el.innerHTML = ''; // derruba o svg antigo → loops antigos param sozinhos
      el.__obVisible = true;
      if (self._io) self._io.observe(el);
      var id = el.getAttribute('data-demo');
      var fn = self['mount_' + id];
      if (typeof fn === 'function') {
        try {
          fn.call(self, el);
        } catch (e) {
          console.error('mount_' + id, e);
        }
      }
    });

    // sonda de validação: window.__obProbe() → opacity computada do rosto por demo
    window.__obProbe = function () {
      var out = {};
      document.querySelectorAll('[data-demo]').forEach(function (el) {
        var map = {
          cabeca: '#head-coroa',
          cauda: '#head-focinho',
          boca: '#lingua',
          olho: '#eye',
        };
        var c = {};
        Object.keys(map).forEach(function (k) {
          var e = el.querySelector(map[k]);
          c[k] = e
            ? Math.round(parseFloat(getComputedStyle(e).opacity) * 1000) / 1000
            : null;
        });
        out[el.getAttribute('data-demo')] = c;
      });
      return out;
    };
  }

  // rAF com guarda dupla: morre quando o svg sai do DOM, dorme fora do viewport
  _raf(el, api, fn) {
    function frame(now) {
      if (!api.svg.isConnected) return;
      if (el.__obVisible === false) {
        requestAnimationFrame(frame);
        return;
      }
      fn(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ============================================================
  // HERO — cobra viva, respirando devagar
  // ============================================================
  mount_HERO(el) {
    var self = this;
    OB.create(el, {}).then(function (api) {
      api.snake.style.transformOrigin = self.CENTER;
      if (api.ring) api.ring.style.transformOrigin = self.RING_CENTER;
      if (self.REDUCED) return; // estático: logo completo, sem movimento
      api.snake.style.animation = 'obSpin 90s linear infinite';
      if (api.ring)
        api.ring.style.animation = 'obSpin 55s linear infinite reverse';
      // o rosto VIAJA com o corpo — mesma rotação e origem, opacity fixa.
      // (antes pulsava parado no lugar enquanto a cobra girava → cabeça e rabo
      //  pareciam sumir/piscar. agora cabeça, cauda, boca e olho giram juntos.)
      api.rosto.forEach(function (e) {
        e.style.opacity = e === api.olho ? '0.65' : '1';
        e.style.transformOrigin = self.CENTER;
        e.style.animation = 'obSpin 90s linear infinite';
      });
    });
  }

  // ============================================================
  // A · ABERTURA
  // ============================================================
  mount_A1(el) {
    var self = this;
    OB.create(el, {}).then(function (api) {
      if (self.REDUCED) return; // estático: logo completo montado
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      var contaFinal = ordered[ordered.length - 1];

      function reset() {
        ordered.forEach(function (b) {
          b.style.transition = 'none';
          b.style.opacity = '0';
          b.style.transformBox = 'fill-box';
          b.style.transformOrigin = '50% 50%';
          b.style.transform = '';
        });
        if (api.wordmark) {
          api.wordmark.style.transition = 'none';
          api.wordmark.style.opacity = '0';
        }
        // estado inicial EXPLÍCITO do rosto: tudo em 0 (a cauda nasce apagada)
        api.rosto.forEach(function (e) {
          e.style.transition = 'none';
          e.style.opacity = '0';
        });
        api.svg.getBoundingClientRect();
      }
      function play() {
        // 1. cabeça + olho primeiro — a cobra nasce pela cabeça
        if (api.cabeca) {
          api.cabeca.style.transition = 'opacity 500ms ease';
          api.cabeca.style.opacity = '1';
        }
        if (api.olho) {
          api.olho.style.transition = 'opacity 500ms ease';
          api.olho.style.opacity = '0.65';
        }
        // 2. cascata pescoço → cauda
        var beadStart = 700,
          stagger = 17;
        ordered.forEach(function (b, i) {
          b.style.transition =
            'opacity 260ms cubic-bezier(.2,.9,.3,1), transform 220ms cubic-bezier(.3,1.5,.5,1)';
          setTimeout(
            function () {
              b.style.opacity = '1';
            },
            beadStart + i * stagger
          );
        });
        var finalTime = beadStart + (ordered.length - 1) * stagger;
        // 3. a CAUDA (#head-focinho) chega por último, JUNTO com a boca que a morde
        setTimeout(function () {
          if (api.cauda) {
            api.cauda.style.transition = 'opacity 340ms ease';
            api.cauda.style.opacity = '1';
          }
          if (api.boca) {
            api.boca.style.transition = 'opacity 340ms ease';
            api.boca.style.opacity = '1';
          }
          contaFinal.style.transform = 'scale(1.55)';
          setTimeout(function () {
            contaFinal.style.transition =
              'transform 300ms cubic-bezier(.4,0,.5,1)';
            contaFinal.style.transform = 'scale(1)';
          }, 220);
        }, finalTime);
        // 4. wordmark por último
        setTimeout(function () {
          if (api.wordmark) {
            api.wordmark.style.transition = 'opacity 500ms ease';
            api.wordmark.style.opacity = '1';
          }
        }, finalTime + 620);
      }
      api.svg.style.transition = 'opacity 350ms ease';
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        api.svg.style.opacity = '1'; // fade-in de volta do fim do ciclo anterior
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          // fim do ciclo: fade-out do logo inteiro — sem snap/piscar no reset
          setTimeout(function () {
            api.svg.style.opacity = '0';
          }, 5050);
          setTimeout(loop, 5400);
        }, 500);
      })();
    });
  }

  mount_A2(el) {
    var self = this;
    OB.create(el, {}).then(function (api) {
      if (self.REDUCED) return;
      var CX = 158.91,
        CY = 159.84;
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      var meta = ordered.map(function (b) {
        return {
          el: b,
          dx: +b.getAttribute('cx') - CX,
          dy: +b.getAttribute('cy') - CY,
        };
      });
      var ultima = meta[meta.length - 1];

      function reset() {
        meta.forEach(function (m) {
          m.el.style.transition = 'none';
          m.el.style.transformBox = 'fill-box';
          m.el.style.transformOrigin = '50% 50%';
          m.el.style.transform =
            'translate(' + -m.dx + 'px, ' + -m.dy + 'px) scale(0.15)';
          m.el.style.opacity = '0';
        });
        // rosto explícito em 0 — cauda e boca só entram no final
        api.rosto.forEach(function (e) {
          e.style.transition = 'none';
          e.style.opacity = '0';
        });
        if (api.wordmark) {
          api.wordmark.style.transition = 'none';
          api.wordmark.style.opacity = '0';
        }
        api.svg.getBoundingClientRect();
      }
      function play() {
        // cabeça brota cedo
        if (api.cabeca) {
          api.cabeca.style.transition = 'opacity 500ms ease';
          api.cabeca.style.opacity = '1';
        }
        if (api.olho) {
          api.olho.style.transition = 'opacity 500ms ease';
          api.olho.style.opacity = '0.65';
        }
        var beadStart = 480,
          stagger = 22;
        meta.forEach(function (m, i) {
          setTimeout(
            function () {
              m.el.style.transition =
                'transform 780ms cubic-bezier(.2,.9,.3,1.15), opacity 480ms ease';
              m.el.style.transform = 'translate(0,0) scale(1)';
              m.el.style.opacity = '1';
            },
            beadStart + i * stagger
          );
        });
        var finalTime = beadStart + (meta.length - 1) * stagger + 780;
        // cauda + boca só ao final — a boca fecha no rabo
        setTimeout(function () {
          if (api.cauda) {
            api.cauda.style.transition = 'opacity 340ms ease';
            api.cauda.style.opacity = '1';
          }
          if (api.boca) {
            api.boca.style.transition = 'opacity 340ms ease';
            api.boca.style.opacity = '1';
          }
          // garante a última conta cheia antes do bounce (a transição de voo é interrompida aqui)
          ultima.el.style.transition =
            'transform 220ms cubic-bezier(.3,1.5,.5,1), opacity 200ms ease';
          ultima.el.style.opacity = '1';
          ultima.el.style.transform = 'translate(0,0) scale(1.4)';
          setTimeout(function () {
            ultima.el.style.transition =
              'transform 300ms cubic-bezier(.4,0,.5,1)';
            ultima.el.style.transform = 'translate(0,0) scale(1)';
          }, 220);
        }, finalTime - 200);
        setTimeout(function () {
          if (api.wordmark) {
            api.wordmark.style.transition = 'opacity 500ms ease';
            api.wordmark.style.opacity = '1';
          }
        }, finalTime + 200);
      }
      api.svg.style.transition = 'opacity 350ms ease';
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        api.svg.style.opacity = '1'; // fade-in de volta do fim do ciclo anterior
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          // fim do ciclo: fade-out do logo inteiro — sem snap/piscar no reset
          setTimeout(function () {
            api.svg.style.opacity = '0';
          }, 5650);
          setTimeout(loop, 6000);
        }, 600);
      })();
    });
  }

  // ============================================================
  // B · ESTADOS VIVOS
  // ============================================================
  mount_B1(el) {
    var self = this;
    OB.create(el, {}).then(function (api) {
      if (api.wordmark) api.wordmark.style.opacity = '0.9';
      if (api.ring) api.ring.style.transformOrigin = self.RING_CENTER;
      if (self.REDUCED) return;
      // rosto pulsa com stagger de 0.1s por elemento — organicidade, nunca constante
      api.rosto.forEach(function (e, i) {
        e.style.animation = 'obPulse 4s ' + i * 0.1 + 's ease-in-out infinite';
      });
      // as contas respiram junto — pulso mais suave no corpo inteiro
      if (api.snake)
        api.snake.style.animation = 'obBreath 4s 0.2s ease-in-out infinite';
      if (api.ring)
        api.ring.style.animation = 'obSpin 60s linear infinite reverse';
    });
  }

  mount_B2(el) {
    var self = this;
    OB.create(el, { hideWordmark: true }).then(function (api) {
      // cobra + rosto giram JUNTOS — mesma origem em todos os elementos
      api.snake.style.transformOrigin = self.CENTER;
      api.snake.style.transition =
        'transform 400ms cubic-bezier(.2,.9,.2,1.15)';
      api.rosto.forEach(function (e) {
        e.style.transformOrigin = self.CENTER;
        e.style.transition = 'transform 400ms cubic-bezier(.2,.9,.2,1.15)';
      });
      // rosto sempre visível POR DESIGN — é o mostrador do relógio (opacity default proposital)
      if (self.REDUCED) return;
      var hour = 0;
      function tick() {
        if (!api.svg.isConnected) return;
        hour++; // ângulo acumula — nunca desenrola 330° para trás no "meio-dia"
        var rot = 'rotate(' + hour * 30 + 'deg)';
        api.snake.style.transform = rot;
        api.rosto.forEach(function (e) {
          e.style.transform = rot;
        });
        setTimeout(tick, 2000);
      }
      setTimeout(tick, 900);
    });
  }

  mount_B3(el) {
    var self = this;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.gap = '32px';
    el.style.padding = '32px';
    var mkSide = function (label, color) {
      var s = document.createElement('div');
      s.style.cssText =
        'display:flex;flex-direction:column;align-items:center;gap:12px';
      var svg = document.createElement('div');
      svg.style.cssText = 'width:120px;height:120px';
      var lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText =
        'font-size:11px;color:' + color + ';letter-spacing:.14em';
      s.appendChild(svg);
      s.appendChild(lbl);
      el.appendChild(s);
      return svg;
    };
    var L = mkSide('pessoa a', '#bd93f9');
    var R = mkSide('pessoa b', '#ff79c6');
    Promise.all([
      OB.create(L, { hideWordmark: true, hideRing: true }),
      OB.create(R, { hideWordmark: true, hideRing: true }),
    ]).then(function (arr) {
      var a1 = arr[0],
        a2 = arr[1];
      // tint 100% por pessoa (cabeça, cauda); boca em cyan nos dois
      a1.beads.forEach(function (b) {
        b.setAttribute('fill', '#bd93f9');
      });
      a2.beads.forEach(function (b) {
        b.setAttribute('fill', '#ff79c6');
      });
      if (a1.cabeca) a1.cabeca.style.fill = '#bd93f9';
      if (a1.cauda) a1.cauda.style.fill = '#bd93f9';
      if (a1.boca) a1.boca.style.fill = '#8be9fd';
      if (a2.cabeca) a2.cabeca.style.fill = '#ff79c6';
      if (a2.cauda) a2.cauda.style.fill = '#ff79c6';
      if (a2.boca) a2.boca.style.fill = '#8be9fd';
      if (self.REDUCED) return;
      // as DUAS no sentido HORÁRIO — snake E rosto giram juntos, sem reverse
      [a1, a2].forEach(function (a) {
        a.snake.style.transformOrigin = self.CENTER;
        a.snake.style.animation = 'obSpin 32s linear infinite';
        a.rosto.forEach(function (e) {
          e.style.transformOrigin = self.CENTER;
          e.style.animation = 'obSpin 32s linear infinite';
        });
      });
    });
  }

  // ============================================================
  // C · FEEDBACK
  // ============================================================
  mount_C1(el) {
    var self = this;
    OB.create(el, {}).then(function (api) {
      if (self.REDUCED) return;
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      var contaFinal = ordered[ordered.length - 1];

      function reset() {
        ordered.forEach(function (b) {
          b.style.transition = 'none';
          b.style.opacity = '0.12';
          b.style.transformBox = 'fill-box';
          b.style.transformOrigin = '50% 50%';
          b.style.transform = '';
        });
        // rosto EXPLÍCITO em 0.12 — cabeça, cauda, olho e boca obedecem o estado
        api.rosto.forEach(function (e) {
          e.style.transition = 'none';
          e.style.opacity = '0.12';
          e.style.filter = '';
        });
        if (api.wordmark) {
          api.wordmark.style.transition = 'none';
          api.wordmark.style.opacity = '0';
        }
        api.svg.getBoundingClientRect();
      }
      function play() {
        // cabeça + olho LIDERAM a cascata — sem "anel sem cabeça" no meio do ciclo
        if (api.cabeca) {
          api.cabeca.style.transition = 'opacity 260ms ease';
          api.cabeca.style.opacity = '1';
        }
        if (api.olho) {
          api.olho.style.transition = 'opacity 260ms ease';
          api.olho.style.opacity = '0.65';
        }
        var stagger = 10;
        ordered.forEach(function (b, i) {
          b.style.transition =
            'opacity 220ms ease, transform 220ms cubic-bezier(.3,1.5,.5,1)';
          setTimeout(function () {
            b.style.opacity = '1';
          }, i * stagger);
        });
        var finalTime = (ordered.length - 1) * stagger;
        // o "clique": no finalTime tudo acende junto; boca e cauda com flash de 260ms
        setTimeout(function () {
          contaFinal.style.transform = 'scale(1.5)';
          if (api.cauda) {
            api.cauda.style.transition =
              'opacity 280ms ease, filter 200ms ease';
            api.cauda.style.opacity = '1';
            api.cauda.style.filter =
              'drop-shadow(0 0 12px #f8f8f2) brightness(1.6)';
          }
          if (api.boca) {
            api.boca.style.transition = 'opacity 280ms ease, filter 200ms ease';
            api.boca.style.opacity = '1';
            api.boca.style.filter =
              'drop-shadow(0 0 8px #f8f8f2) brightness(1.5)';
          }
          setTimeout(function () {
            contaFinal.style.transition =
              'transform 300ms cubic-bezier(.4,0,.5,1)';
            contaFinal.style.transform = 'scale(1)';
            if (api.cauda) api.cauda.style.filter = '';
            if (api.boca) api.boca.style.filter = '';
          }, 260);
        }, finalTime + 40);
        setTimeout(function () {
          if (api.wordmark) {
            api.wordmark.style.transition = 'opacity 500ms ease';
            api.wordmark.style.opacity = '1';
          }
        }, finalTime + 520);
      }
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          setTimeout(loop, 4200);
        }, 400);
      })();
    });
  }

  mount_C2(el) {
    var self = this;
    OB.create(el, { hideWordmark: true }).then(function (api) {
      if (self.REDUCED) return;
      var ordered = OB.orderFromHead(api.beads, 'cw');
      var N = ordered.length;
      var start = performance.now();
      self._raf(el, api, function (now) {
        var t = ((now - start) / 2400) % 1;
        for (var i = 0; i < N; i++) {
          var d = Math.abs(t - i / N);
          if (d > 0.5) d = 1 - d;
          ordered[i].style.opacity = (
            0.15 +
            0.85 * Math.exp(-d * d * 80)
          ).toFixed(3);
        }
        // rosto EM FASE com a onda: acende quando o pulso cruza a boca (t≈0),
        // como se a digestão passasse pela cabeça — nunca constante, nunca aleatório
        var dh = t > 0.5 ? 1 - t : t;
        var face = 0.3 + 0.7 * Math.exp(-dh * dh * 60);
        if (api.cabeca) api.cabeca.style.opacity = face.toFixed(3);
        if (api.cauda) api.cauda.style.opacity = face.toFixed(3);
        if (api.boca) api.boca.style.opacity = face.toFixed(3);
        if (api.olho) api.olho.style.opacity = (face * 0.65).toFixed(3);
      });
    });
  }

  mount_C3(el) {
    var self = this;
    OB.create(el, { hideWordmark: true }).then(function (api) {
      // fill: manipular SÓ a propriedade, nunca reescrever o style attr inteiro.
      // (a versão anterior restaurava um snapshot do attr SEM opacity — cabeça e boca
      //  voltavam para opacity 1 e ficavam permanentemente acesas. era ESTE o bug.)
      var alvos = ['cabeca', 'boca'];
      var fillOriginal = {};
      alvos.forEach(function (k) {
        if (api[k]) fillOriginal[k] = getComputedStyle(api[k]).fill;
      });
      function setRed(on) {
        alvos.forEach(function (k) {
          if (!api[k]) return;
          if (on) api[k].style.setProperty('fill', '#ff5555', 'important');
          else api[k].style.setProperty('fill', fillOriginal[k]);
        });
      }

      function reset() {
        // DEFAULT: TUDO apagado — contas E os quatro do rosto em 0.08
        api.beads.forEach(function (b) {
          b.style.transition = 'none';
          b.style.opacity = '0.08';
        });
        api.rosto.forEach(function (e) {
          e.style.transition = 'none';
          e.style.opacity = '0.08';
        });
        setRed(false);
        api.svg.getBoundingClientRect();
      }
      function play() {
        // cabeça + boca acendem em vermelho; cauda e olho PERMANECEM apagados
        setRed(true);
        if (api.cabeca) {
          api.cabeca.style.transition = 'opacity 140ms ease';
          api.cabeca.style.opacity = '1';
        }
        if (api.boca) {
          api.boca.style.transition = 'opacity 140ms ease';
          api.boca.style.opacity = '1';
        }
        var i = 0;
        (function pulse() {
          if (!api.svg.isConnected) return;
          i++;
          if (i > 6) {
            setTimeout(function () {
              if (api.cabeca) {
                api.cabeca.style.transition = 'opacity 600ms ease';
                api.cabeca.style.opacity = '0.08';
              }
              if (api.boca) {
                api.boca.style.transition = 'opacity 600ms ease';
                api.boca.style.opacity = '0.08';
              }
              // a cor só volta ao roxo DEPOIS do fade — sem snap visível
              setTimeout(function () {
                setRed(false);
              }, 650);
            }, 340);
            return;
          }
          var on = i % 2 === 1;
          if (api.cabeca) api.cabeca.style.opacity = on ? '1' : '0.35';
          if (api.boca) api.boca.style.opacity = on ? '1' : '0.35';
          setTimeout(pulse, 170);
        })();
      }
      if (self.REDUCED) {
        // estático: estado de alerta congelado
        api.beads.forEach(function (b) {
          b.style.opacity = '0.08';
        });
        api.rosto.forEach(function (e) {
          e.style.opacity = '0.08';
        });
        setRed(true);
        if (api.cabeca) api.cabeca.style.opacity = '1';
        if (api.boca) api.boca.style.opacity = '1';
        return;
      }
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          setTimeout(loop, 3800);
        }, 500);
      })();
    });
  }

  // ============================================================
  // D · LONGA DURAÇÃO
  // ============================================================
  mount_D1(el) {
    var self = this;
    // layout coluna: svg em cima, status abaixo — nunca sobreposto
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'stretch';
    el.style.padding = '20px 14px 14px';

    var svgWrap = document.createElement('div');
    svgWrap.style.cssText =
      'flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative';
    el.appendChild(svgWrap);
    var status = document.createElement('div');
    status.style.cssText =
      "text-align:center;font-size:11px;color:#c9c9cc;font-family:'JetBrains Mono',monospace;letter-spacing:.02em;pointer-events:none;padding-top:10px";
    el.appendChild(status);
    var svgHost = document.createElement('div');
    svgHost.style.cssText =
      'width:100%;height:100%;aspect-ratio:1;max-height:100%';
    svgWrap.appendChild(svgHost);

    OB.create(svgHost, { hideWordmark: true }).then(function (api) {
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      var N = ordered.length;
      var files = [
        'extrato_nubank.ofx',
        'fatura_c6.pdf',
        'holerite.pdf',
        'pix_mercado.pdf',
        'nfce_2026-04.xml',
        'extrato_itau.ofx',
        'aluguel.pdf',
        'conta_luz.pdf',
        'das_mei.pdf',
      ];
      var NF = files.length;
      function setStatus(idx) {
        status.innerHTML =
          '<span style="color:#bd93f9">></span> arquivo <b style="color:#f8f8f2;font-weight:500">' +
          (idx + 1) +
          '/' +
          NF +
          '</b> · ' +
          files[idx];
      }
      if (self.REDUCED) {
        api.rosto.forEach(function (e) {
          e.style.opacity = '1';
        });
        if (api.olho) api.olho.style.opacity = '0.65';
        setStatus(NF - 1);
        return;
      }
      ordered.forEach(function (b) {
        b.style.transition = '';
      });
      var CYCLE = 7500,
        HOLD = 700; // segura 700ms completo antes de reiniciar
      var lastIdx = -1;
      var start = performance.now();
      self._raf(el, api, function (now) {
        var e = (now - start) % (CYCLE + HOLD);
        var t = Math.min(1, e / CYCLE);
        // fade suave nos últimos 300ms do ciclo — sem snap no wrap
        var fade =
          e > CYCLE + HOLD - 300 ? Math.max(0, (CYCLE + HOLD - e) / 300) : 1;
        var frente = t * N;
        for (var i = 0; i < N; i++) {
          var o = frente - i;
          var bo = o >= 1 ? 1 : o <= 0 ? 0.1 : 0.1 + o * 0.9;
          ordered[i].style.opacity = (0.1 + (bo - 0.1) * fade).toFixed(3);
        }
        // cabeça + olho LIDERAM a cascata (sobem nos primeiros ~12%);
        // cauda + boca só acendem DEPOIS da última conta (últimos ~6%) —
        // é a boca fechando no rabo quando o ciclo completa.
        var headOp = 0.15 + (Math.min(1, 0.15 + t * 7) - 0.15) * fade;
        var tailOp =
          0.15 +
          ((t < 0.94 ? 0.15 : Math.min(1, 0.15 + (t - 0.94) * 14.2)) - 0.15) *
            fade;
        if (api.cabeca) api.cabeca.style.opacity = headOp.toFixed(3);
        if (api.olho) api.olho.style.opacity = (headOp * 0.65).toFixed(3);
        if (api.cauda) api.cauda.style.opacity = tailOp.toFixed(3);
        if (api.boca) api.boca.style.opacity = tailOp.toFixed(3);
        var idx = Math.min(NF - 1, Math.floor(t * NF));
        if (idx !== lastIdx) {
          lastIdx = idx;
          setStatus(idx);
        }
      });
    });
  }

  mount_D2(el) {
    var self = this;
    el.style.position = 'relative';
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'width:100%;height:100%';
    el.appendChild(svgWrap);
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:absolute;inset:0;pointer-events:none;overflow:hidden';
    el.appendChild(overlay);

    OB.create(svgWrap, { hideWordmark: true }).then(function (api) {
      if (self.REDUCED) return; // estático: só o símbolo
      // cobra + rosto giram JUNTOS
      api.snake.style.transformOrigin = self.CENTER;
      api.snake.style.animation = 'obSpin 60s linear infinite';
      api.rosto.forEach(function (e) {
        e.style.transformOrigin = self.CENTER;
        e.style.animation = 'obSpin 60s linear infinite';
      });

      var filenames = [
        'humor-2026-04-28.md',
        'pix-mercado.md',
        'evento-cafe.md',
        'treino-b.md',
        'medidas.md',
        'diario-2026-04-28.md',
        'nfce-2026-04.md',
        'holerite-2026-04.md',
        'conta-luz.md',
        'daily-2026-04-27.md',
        'foto-lembranca.md',
      ];
      var i = 0;
      function spawn() {
        var s = document.createElement('div');
        s.textContent = filenames[i++ % filenames.length];
        // sparks vivem DENTRO do anel: nascem em 28%, morrem em 72%, 5.4s de trajeto
        s.style.cssText =
          "position:absolute;top:28%;left:50%;transform:translate(-50%,0);color:#8be9fd;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.02em;opacity:0;transition:opacity 900ms ease, top 5400ms cubic-bezier(.4,0,.55,1), transform 5400ms cubic-bezier(.4,0,.55,1);white-space:nowrap;text-shadow:0 0 10px rgba(139,233,253,.5)";
        overlay.appendChild(s);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            s.style.opacity = '1';
            s.style.top = '72%';
            s.style.transform = 'translate(-50%,0) scale(0.82)';
            setTimeout(function () {
              s.style.opacity = '0';
            }, 3900);
            setTimeout(function () {
              if (s.parentNode) s.parentNode.removeChild(s);
            }, 5500);
          });
        });
      }
      spawn();
      var iv = setInterval(function () {
        if (!overlay.isConnected) {
          clearInterval(iv);
          return;
        } // idempotência no hot-reload
        if (el.__obVisible === false) return; // não acumula sparks fora do viewport
        spawn();
      }, 1400);
    });
  }

  mount_D3(el) {
    var self = this;
    el.style.position = 'relative';
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'width:100%;height:100%';
    el.appendChild(svgWrap);
    var num = document.createElement('div');
    // peso 500 — a UI nunca usa 600+
    num.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#f8f8f2;font-family:'JetBrains Mono',monospace;font-weight:500;letter-spacing:-.02em;text-shadow:0 2px 20px rgba(0,0,0,.6);pointer-events:none;line-height:1;font-variant-numeric:tabular-nums";
    num.innerHTML =
      '<span id="d3n" style="font-size:56px">0</span><small style="font-size:22px;color:#6272a4;font-weight:500;margin-left:2px">%</small>';
    el.appendChild(num);

    OB.create(svgWrap, { hideWordmark: true }).then(function (api) {
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      var N = ordered.length;
      var display = num.querySelector('#d3n');
      if (self.REDUCED) {
        display.textContent = '100';
        api.rosto.forEach(function (e) {
          e.style.opacity = '1';
        });
        if (api.olho) api.olho.style.opacity = '0.65';
        return;
      }
      ordered.forEach(function (b) {
        b.style.transition = '';
      });
      var CYCLE = 8000,
        HOLD = 900; // segura em 100% antes de reiniciar
      var start = performance.now();
      self._raf(el, api, function (now) {
        var e = (now - start) % (CYCLE + HOLD);
        var t = Math.min(1, e / CYCLE);
        display.textContent = Math.round(t * 100);
        // fade suave nos últimos 300ms do ciclo — sem snap no wrap
        var fade =
          e > CYCLE + HOLD - 300 ? Math.max(0, (CYCLE + HOLD - e) / 300) : 1;
        var frente = t * N;
        for (var i = 0; i < N; i++) {
          var o = frente - i;
          var bo = o >= 1 ? 1 : o <= 0 ? 0.1 : 0.1 + o * 0.9;
          ordered[i].style.opacity = (0.1 + (bo - 0.1) * fade).toFixed(3);
        }
        // cabeça + olho lideram; cauda + boca só após a última conta (percentual → 100)
        var headOp = 0.15 + (Math.min(1, 0.15 + t * 7) - 0.15) * fade;
        var tailOp =
          0.15 +
          ((t < 0.94 ? 0.15 : Math.min(1, 0.15 + (t - 0.94) * 14.2)) - 0.15) *
            fade;
        if (api.cabeca) api.cabeca.style.opacity = headOp.toFixed(3);
        if (api.olho) api.olho.style.opacity = (headOp * 0.65).toFixed(3);
        if (api.cauda) api.cauda.style.opacity = tailOp.toFixed(3);
        if (api.boca) api.boca.style.opacity = tailOp.toFixed(3);
      });
    });
  }

  // ============================================================
  // E · MONOMARKS
  // ============================================================
  mount_E1(el) {
    var self = this;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'width:82%;height:82%';
    el.appendChild(wrap);
    // rosto + contas 01, 02 (pescoço) e 42, 43 (vizinhas da cauda)
    OB.create(wrap, { hideRing: true, hideWordmark: true }).then(
      function (api) {
        var keep = {
          'conta-01': 1,
          'conta-02': 1,
          'conta-42': 1,
          'conta-43': 1,
        };
        api.beads.forEach(function (b) {
          if (!keep[b.id]) b.style.display = 'none';
        });
        api.svg.setAttribute('viewBox', '90 30 140 55');
        // rosto sempre visível POR DESIGN (é um favicon) — opacity default proposital
        if (self.REDUCED || !api.olho) return;
        api.olho.style.transition = 'opacity 120ms';
        var iv = setInterval(function () {
          if (!api.svg.isConnected) {
            clearInterval(iv);
            return;
          } // idempotência
          if (el.__obVisible === false) return;
          api.olho.style.opacity = '0';
          setTimeout(function () {
            api.olho.style.opacity = '0.65';
          }, 140);
        }, 5200);
      }
    );
  }

  mount_E2(el) {
    var self = this;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'width:72%;height:72%';
    el.appendChild(wrap);
    OB.create(wrap, {
      hideBeads: true,
      hideRosto: true,
      hideWordmark: true,
    }).then(function (api) {
      if (api.ring) {
        api.ring.style.transformOrigin = self.RING_CENTER; // centro REAL do anel — sem wobble
        if (!self.REDUCED)
          api.ring.style.animation = 'obSpin 40s linear infinite';
      }
    });
  }

  mount_E3(el) {
    var mono = "font-family:'JetBrains Mono',monospace;";
    el.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px">' +
      '<div style="display:flex;align-items:center;gap:14px">' +
      '<div style="width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#fc7ac8,#bd93f9);box-shadow:0 0 14px rgba(189,147,249,.55)"></div>' +
      '<div style="' +
      mono +
      'font-size:22px;font-weight:500;color:#bd93f9;letter-spacing:.01em">ouroboros</div></div>' +
      '<div style="font-size:10px;color:#6272a4;letter-spacing:.24em;text-transform:uppercase">protocolo</div></div>';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
  }

  // ============================================================
  // F · RITUAIS
  // ============================================================
  mount_F1(el) {
    var self = this;
    el.style.position = 'relative';
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'width:100%;height:100%';
    el.appendChild(svgWrap);
    var overlay = document.createElement('div');
    overlay.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:16px;color:#f1fa8c;opacity:0;transition:opacity 400ms;font-family:'JetBrains Mono',monospace;letter-spacing:.02em";
    overlay.textContent = 'novo dia.';
    el.appendChild(overlay);

    OB.create(svgWrap, {}).then(function (api) {
      if (self.REDUCED) return; // estático: logo + wordmark
      if (api.wordmark) api.wordmark.style.transition = 'opacity 400ms';
      // cobra + rosto giram JUNTOS — mesma origem
      var rotAll = function (v) {
        api.snake.style.transform = v;
        api.rosto.forEach(function (e) {
          e.style.transform = v;
        });
      };
      var setTrans = function (t) {
        api.snake.style.transition = t;
        api.rosto.forEach(function (e) {
          e.style.transition = t;
        });
      };
      api.snake.style.transformOrigin = self.CENTER;
      api.rosto.forEach(function (e) {
        e.style.transformOrigin = self.CENTER;
      });
      function reset() {
        setTrans('none');
        rotAll('rotate(0deg)'); // 0 ≡ 360 — snap invisível
        if (api.wordmark) api.wordmark.style.opacity = '1';
        overlay.style.opacity = '0';
        api.svg.getBoundingClientRect();
      }
      function play() {
        setTrans('transform 1600ms cubic-bezier(.55,.05,.35,1)');
        rotAll('rotate(360deg)');
        if (api.wordmark) api.wordmark.style.opacity = '0';
        setTimeout(function () {
          overlay.style.opacity = '1';
        }, 500);
        setTimeout(function () {
          overlay.style.opacity = '0';
        }, 2200);
        setTimeout(function () {
          if (api.wordmark) api.wordmark.style.opacity = '1';
        }, 2600);
      }
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          setTimeout(loop, 5200);
        }, 800);
      })();
    });
  }

  mount_F2(el) {
    var self = this;
    el.style.position = 'relative';
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText = 'width:100%;height:100%';
    el.appendChild(svgWrap);
    var badge = document.createElement('div');
    badge.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:6px 14px;background:rgba(189,147,249,.14);border:1px solid rgba(189,147,249,.32);border-radius:100px;font-size:11px;color:#f8f8f2;font-family:'JetBrains Mono',monospace;letter-spacing:.02em;opacity:0;transition:opacity 400ms ease";
    badge.textContent = 'abril fechado.';
    el.appendChild(badge);

    OB.create(svgWrap, { hideWordmark: true }).then(function (api) {
      if (self.REDUCED) return;
      // contas + rosto desaturam JUNTOS
      var applyFilter = function (f) {
        if (api.snake) api.snake.style.filter = f;
        api.rosto.forEach(function (e) {
          e.style.filter = f;
        });
      };
      var setTrans = function (t) {
        if (api.snake) api.snake.style.transition = t;
        api.rosto.forEach(function (e) {
          e.style.transition = t;
        });
      };
      setTrans('filter 900ms ease');

      function reset() {
        applyFilter('none');
        badge.style.opacity = '0';
        badge.textContent = 'abril fechado.';
      }
      function play() {
        applyFilter('saturate(0.12) brightness(0.7)');
        badge.style.opacity = '1';
        setTimeout(function () {
          badge.textContent = 'maio começa.';
        }, 1400);
        setTimeout(function () {
          applyFilter('none');
        }, 2600);
        setTimeout(function () {
          badge.style.opacity = '0';
        }, 3200);
      }
      (function loop() {
        if (!api.svg.isConnected) return;
        reset();
        setTimeout(function () {
          if (!api.svg.isConnected) return;
          play();
          setTimeout(loop, 4600);
        }, 500);
      })();
    });
  }

  // ============================================================
  // G · ARQUITETURA
  // ============================================================
  mount_G1(el) {
    var self = this;
    el.style.position = 'relative';
    var svgWrap = document.createElement('div');
    svgWrap.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(70%,420px);aspect-ratio:1';
    el.appendChild(svgWrap);

    OB.create(svgWrap, { hideWordmark: true }).then(function (api) {
      var ordered = OB.orderFromHead(api.beads, 'ccw');
      // faixas alinhadas com a legenda do card: 1-8 · 9-17 · 18-26 · 27-35 · 36-43
      var segments = [
        { color: '#fc7ac8', from: 0, to: 8 }, // extração
        { color: '#e284dd', from: 8, to: 17 }, // normalização
        { color: '#d18bea', from: 17, to: 26 }, // dedup
        { color: '#c092f7', from: 26, to: 35 }, // categorização
        { color: '#bd93f9', from: 35, to: 43 }, // saída
      ];
      segments.forEach(function (seg) {
        for (var i = seg.from; i < seg.to && i < ordered.length; i++) {
          ordered[i].style.filter = 'drop-shadow(0 0 4px ' + seg.color + ')';
        }
      });
      // rosto brilha discreto — não compete com os rótulos
      api.rosto.forEach(function (e) {
        e.style.filter = 'drop-shadow(0 0 3px #bd93f9)';
      });
      // ARQUITETURA VIVA — o diagrama NÃO gira (girar desalinhava cada segmento
      // do seu rótulo, e viola o princípio 01: nada gira à toa). Em vez disso,
      // um pulso de "dado" viaja pela cobra cabeça→cauda: entra cru na extração,
      // sai categorizado na saída. arquitetura que respira sem se mexer.
      if (!self.REDUCED) {
        var NB = ordered.length;
        var startG = performance.now();
        self._raf(el, api, function (now) {
          var t = ((now - startG) / 5200) % 1; // 1 pulso a cada 5.2s
          var frente = t * NB;
          for (var i = 0; i < NB; i++) {
            var d = frente - i;
            if (d < 0) d += NB; // envolve o anel
            var glow = Math.exp(-d * d * 0.35); // esteira curta atrás da frente
            ordered[i].style.opacity = (0.4 + 0.6 * glow).toFixed(3);
          }
        });
      }
      // rótulos ancorados por lado — nunca saem da caixa
      var TF = {
        top: 'translate(-50%, 0)',
        right: 'translate(-100%, -50%)',
        bottom: 'translate(-50%, -100%)',
        left: 'translate(0, -50%)',
      };
      // posições casadas com os arcos REAIS dos segmentos (pescoço no topo-esq,
      // corpo corre anti-horário): 1-8 esq-topo · 9-17 esq-baixo · 18-26 baixo ·
      // 27-35 dir-baixo · 36-43 dir-topo
      var labels = [
        { text: 'extração', color: '#fc7ac8', side: 'left', x: '7%', y: '24%' },
        {
          text: 'normalização',
          color: '#e284dd',
          side: 'left',
          x: '7%',
          y: '70%',
        },
        { text: 'dedup', color: '#d18bea', side: 'bottom', x: '50%', y: '93%' },
        {
          text: 'categorização',
          color: '#c092f7',
          side: 'right',
          x: '93%',
          y: '66%',
        },
        {
          text: 'saída · irpf',
          color: '#bd93f9',
          side: 'right',
          x: '93%',
          y: '24%',
        },
      ];
      labels.forEach(function (L) {
        var t = document.createElement('div');
        t.textContent = L.text;
        t.style.cssText =
          'position:absolute;top:' +
          L.y +
          ';left:' +
          L.x +
          ';transform:' +
          TF[L.side] +
          ';font-size:11.5px;color:' +
          L.color +
          ";font-family:'JetBrains Mono',monospace;background:rgba(15,16,21,.88);padding:4px 10px;border-radius:6px;letter-spacing:.02em;border:1px solid " +
          L.color +
          '33;box-shadow:0 0 12px ' +
          L.color +
          '22;white-space:nowrap;font-weight:500';
        el.appendChild(t);
      });
    });
  }
}
