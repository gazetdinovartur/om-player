var Ee = Object.defineProperty;
var Te = (a, e, t) => e in a ? Ee(a, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : a[e] = t;
var u = (a, e, t) => Te(a, typeof e != "symbol" ? e + "" : e, t);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const z = globalThis, re = z.ShadowRoot && (z.ShadyCSS === void 0 || z.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Pe = Symbol(), ue = /* @__PURE__ */ new WeakMap();
let Ie = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Pe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (re && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = ue.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && ue.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const $e = (a) => new Ie(typeof a == "string" ? a : a + "", void 0, Pe), Ce = (a, e) => {
  if (re) a.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = z.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, a.appendChild(i);
  }
}, he = re ? (a) => a : (a) => a instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return $e(t);
})(a) : a;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Ue, defineProperty: Ne, getOwnPropertyDescriptor: Le, getOwnPropertyNames: De, getOwnPropertySymbols: Re, getPrototypeOf: Qe } = Object, k = globalThis, ce = k.trustedTypes, ze = ce ? ce.emptyScript : "", O = k.reactiveElementPolyfillSupport, T = (a, e) => a, ie = { toAttribute(a, e) {
  switch (e) {
    case Boolean:
      a = a ? ze : null;
      break;
    case Object:
    case Array:
      a = a == null ? a : JSON.stringify(a);
  }
  return a;
}, fromAttribute(a, e) {
  let t = a;
  switch (e) {
    case Boolean:
      t = a !== null;
      break;
    case Number:
      t = a === null ? null : Number(a);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(a);
      } catch {
        t = null;
      }
  }
  return t;
} }, qe = (a, e) => !Ue(a, e), de = { attribute: !0, type: String, converter: ie, reflect: !1, useDefault: !1, hasChanged: qe };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), k.litPropertyMetadata ?? (k.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let S = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = de) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && Ne(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: r } = Le(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: s, set(n) {
      const l = s == null ? void 0 : s.call(this);
      r == null || r.call(this, n), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? de;
  }
  static _$Ei() {
    if (this.hasOwnProperty(T("elementProperties"))) return;
    const e = Qe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(T("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(T("properties"))) {
      const t = this.properties, i = [...De(t), ...Re(t)];
      for (const s of i) this.createProperty(s, t[s]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, s] of t) this.elementProperties.set(i, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const s = this._$Eu(t, i);
      s !== void 0 && this._$Eh.set(s, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const s of i) t.unshift(he(s));
    } else e !== void 0 && t.push(he(e));
    return t;
  }
  static _$Eu(e, t) {
    const i = t.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const i of t.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Ce(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostConnected) == null ? void 0 : i.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostDisconnected) == null ? void 0 : i.call(t);
    });
  }
  attributeChangedCallback(e, t, i) {
    this._$AK(e, i);
  }
  _$ET(e, t) {
    var r;
    const i = this.constructor.elementProperties.get(e), s = this.constructor._$Eu(e, i);
    if (s !== void 0 && i.reflect === !0) {
      const n = (((r = i.converter) == null ? void 0 : r.toAttribute) !== void 0 ? i.converter : ie).toAttribute(t, i.type);
      this._$Em = e, n == null ? this.removeAttribute(s) : this.setAttribute(s, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var r, n;
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const l = i.getPropertyOptions(s), o = typeof l.converter == "function" ? { fromAttribute: l.converter } : ((r = l.converter) == null ? void 0 : r.fromAttribute) !== void 0 ? l.converter : ie;
      this._$Em = s;
      const d = o.fromAttribute(t, l.type);
      this[s] = d ?? ((n = this._$Ej) == null ? void 0 : n.get(s)) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, r) {
    var n;
    if (e !== void 0) {
      const l = this.constructor;
      if (s === !1 && (r = this[e]), i ?? (i = l.getPropertyOptions(e)), !((i.hasChanged ?? qe)(r, t) || i.useDefault && i.reflect && r === ((n = this._$Ej) == null ? void 0 : n.get(e)) && !this.hasAttribute(l._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: r }, n) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), r !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [r, n] of this._$Ep) this[r] = n;
        this._$Ep = void 0;
      }
      const s = this.constructor.elementProperties;
      if (s.size > 0) for (const [r, n] of s) {
        const { wrapped: l } = n, o = this[r];
        l !== !0 || this._$AL.has(r) || o === void 0 || this.C(r, void 0, n, o);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (i = this._$EO) == null || i.forEach((s) => {
        var r;
        return (r = s.hostUpdate) == null ? void 0 : r.call(s);
      }), this.update(t)) : this._$EM();
    } catch (s) {
      throw e = !1, this._$EM(), s;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((i) => {
      var s;
      return (s = i.hostUpdated) == null ? void 0 : s.call(i);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[T("elementProperties")] = /* @__PURE__ */ new Map(), S[T("finalized")] = /* @__PURE__ */ new Map(), O == null || O({ ReactiveElement: S }), (k.reactiveElementVersions ?? (k.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const I = globalThis, pe = (a) => a, H = I.trustedTypes, ge = H ? H.createPolicy("lit-html", { createHTML: (a) => a }) : void 0, Se = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, Ae = "?" + y, He = `<${Ae}>`, $ = document, U = () => $.createComment(""), N = (a) => a === null || typeof a != "object" && typeof a != "function", ne = Array.isArray, Fe = (a) => ne(a) || typeof (a == null ? void 0 : a[Symbol.iterator]) == "function", j = `[ 	
\f\r]`, E = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, fe = />/g, x = RegExp(`>|${j}(?:([^\\s"'>=/]+)(${j}*=${j}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), be = /'/g, ve = /"/g, _e = /^(?:script|style|textarea|title)$/i, Be = (a) => (e, ...t) => ({ _$litType$: a, strings: e, values: t }), h = Be(1), A = Symbol.for("lit-noChange"), c = Symbol.for("lit-nothing"), ye = /* @__PURE__ */ new WeakMap(), w = $.createTreeWalker($, 129);
function Me(a, e) {
  if (!ne(a) || !a.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ge !== void 0 ? ge.createHTML(e) : e;
}
const Oe = (a, e) => {
  const t = a.length - 1, i = [];
  let s, r = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = E;
  for (let l = 0; l < t; l++) {
    const o = a[l];
    let d, p, g = -1, m = 0;
    for (; m < o.length && (n.lastIndex = m, p = n.exec(o), p !== null); ) m = n.lastIndex, n === E ? p[1] === "!--" ? n = me : p[1] !== void 0 ? n = fe : p[2] !== void 0 ? (_e.test(p[2]) && (s = RegExp("</" + p[2], "g")), n = x) : p[3] !== void 0 && (n = x) : n === x ? p[0] === ">" ? (n = s ?? E, g = -1) : p[1] === void 0 ? g = -2 : (g = n.lastIndex - p[2].length, d = p[1], n = p[3] === void 0 ? x : p[3] === '"' ? ve : be) : n === ve || n === be ? n = x : n === me || n === fe ? n = E : (n = x, s = void 0);
    const b = n === x && a[l + 1].startsWith("/>") ? " " : "";
    r += n === E ? o + He : g >= 0 ? (i.push(d), o.slice(0, g) + Se + o.slice(g) + y + b) : o + y + (g === -2 ? l : b);
  }
  return [Me(a, r + (a[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class L {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let r = 0, n = 0;
    const l = e.length - 1, o = this.parts, [d, p] = Oe(e, t);
    if (this.el = L.createElement(d, i), w.currentNode = this.el.content, t === 2 || t === 3) {
      const g = this.el.content.firstChild;
      g.replaceWith(...g.childNodes);
    }
    for (; (s = w.nextNode()) !== null && o.length < l; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const g of s.getAttributeNames()) if (g.endsWith(Se)) {
          const m = p[n++], b = s.getAttribute(g).split(y), v = /([.?@])?(.*)/.exec(m);
          o.push({ type: 1, index: r, name: v[2], strings: b, ctor: v[1] === "." ? Ge : v[1] === "?" ? Ve : v[1] === "@" ? Ke : F }), s.removeAttribute(g);
        } else g.startsWith(y) && (o.push({ type: 6, index: r }), s.removeAttribute(g));
        if (_e.test(s.tagName)) {
          const g = s.textContent.split(y), m = g.length - 1;
          if (m > 0) {
            s.textContent = H ? H.emptyScript : "";
            for (let b = 0; b < m; b++) s.append(g[b], U()), w.nextNode(), o.push({ type: 2, index: ++r });
            s.append(g[m], U());
          }
        }
      } else if (s.nodeType === 8) if (s.data === Ae) o.push({ type: 2, index: r });
      else {
        let g = -1;
        for (; (g = s.data.indexOf(y, g + 1)) !== -1; ) o.push({ type: 7, index: r }), g += y.length - 1;
      }
      r++;
    }
  }
  static createElement(e, t) {
    const i = $.createElement("template");
    return i.innerHTML = e, i;
  }
}
function _(a, e, t = a, i) {
  var n, l;
  if (e === A) return e;
  let s = i !== void 0 ? (n = t._$Co) == null ? void 0 : n[i] : t._$Cl;
  const r = N(e) ? void 0 : e._$litDirective$;
  return (s == null ? void 0 : s.constructor) !== r && ((l = s == null ? void 0 : s._$AO) == null || l.call(s, !1), r === void 0 ? s = void 0 : (s = new r(a), s._$AT(a, t, i)), i !== void 0 ? (t._$Co ?? (t._$Co = []))[i] = s : t._$Cl = s), s !== void 0 && (e = _(a, s._$AS(a, e.values), s, i)), e;
}
class je {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: i } = this._$AD, s = ((e == null ? void 0 : e.creationScope) ?? $).importNode(t, !0);
    w.currentNode = s;
    let r = w.nextNode(), n = 0, l = 0, o = i[0];
    for (; o !== void 0; ) {
      if (n === o.index) {
        let d;
        o.type === 2 ? d = new D(r, r.nextSibling, this, e) : o.type === 1 ? d = new o.ctor(r, o.name, o.strings, this, e) : o.type === 6 && (d = new Ye(r, this, e)), this._$AV.push(d), o = i[++l];
      }
      n !== (o == null ? void 0 : o.index) && (r = w.nextNode(), n++);
    }
    return w.currentNode = $, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class D {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, i, s) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = s, this._$Cv = (s == null ? void 0 : s.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = _(this, e, t), N(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== A && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Fe(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && N(this._$AH) ? this._$AA.nextSibling.data = e : this.T($.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var r;
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = L.createElement(Me(i.h, i.h[0]), this.options)), i);
    if (((r = this._$AH) == null ? void 0 : r._$AD) === s) this._$AH.p(t);
    else {
      const n = new je(s, this), l = n.u(this.options);
      n.p(t), this.T(l), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = ye.get(e.strings);
    return t === void 0 && ye.set(e.strings, t = new L(e)), t;
  }
  k(e) {
    ne(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const r of e) s === t.length ? t.push(i = new D(this.O(U()), this.O(U()), this, this.options)) : i = t[s], i._$AI(r), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var i;
    for ((i = this._$AP) == null ? void 0 : i.call(this, !1, !0, t); e !== this._$AB; ) {
      const s = pe(e).nextSibling;
      pe(e).remove(), e = s;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class F {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, s, r) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = r, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = c;
  }
  _$AI(e, t = this, i, s) {
    const r = this.strings;
    let n = !1;
    if (r === void 0) e = _(this, e, t, 0), n = !N(e) || e !== this._$AH && e !== A, n && (this._$AH = e);
    else {
      const l = e;
      let o, d;
      for (e = r[0], o = 0; o < r.length - 1; o++) d = _(this, l[i + o], t, o), d === A && (d = this._$AH[o]), n || (n = !N(d) || d !== this._$AH[o]), d === c ? e = c : e !== c && (e += (d ?? "") + r[o + 1]), this._$AH[o] = d;
    }
    n && !s && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ge extends F {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class Ve extends F {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class Ke extends F {
  constructor(e, t, i, s, r) {
    super(e, t, i, s, r), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = _(this, e, t, 0) ?? c) === A) return;
    const i = this._$AH, s = e === c && i !== c || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, r = e !== c && (i === c || s);
    s && this.element.removeEventListener(this.name, this, i), r && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ye {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    _(this, e);
  }
}
const G = I.litHtmlPolyfillSupport;
G == null || G(L, D), (I.litHtmlVersions ?? (I.litHtmlVersions = [])).push("3.3.3");
const We = (a, e, t) => {
  const i = (t == null ? void 0 : t.renderBefore) ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const r = (t == null ? void 0 : t.renderBefore) ?? null;
    i._$litPart$ = s = new D(e.insertBefore(U(), r), r, void 0, t ?? {});
  }
  return s._$AI(a), s;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const P = globalThis;
class C extends S {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = We(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
  }
  render() {
    return A;
  }
}
var we;
C._$litElement$ = !0, C.finalized = !0, (we = P.litElementHydrateSupport) == null || we.call(P, { LitElement: C });
const V = P.litElementPolyfillSupport;
V == null || V({ LitElement: C });
(P.litElementVersions ?? (P.litElementVersions = [])).push("4.2.2");
class Je {
  constructor(e) {
    this.baseUrl = e;
  }
  async getTrack(e) {
    const t = await fetch(`${this.baseUrl}/tracks/${encodeURIComponent(e)}`);
    if (!t.ok) throw new Error("Track not found");
    return t.json();
  }
  async getAlbumTracks(e) {
    const t = await fetch(`${this.baseUrl}/albums/${encodeURIComponent(e)}/tracks`);
    if (!t.ok) throw new Error("Album not found");
    return t.json();
  }
  async getPlaylistTracks(e) {
    const t = await fetch(`${this.baseUrl}/playlists/${encodeURIComponent(e)}`);
    if (!t.ok) throw new Error("Playlist not found");
    return t.json();
  }
}
function Ze(a, e) {
  if (!e) return null;
  if (/^https?:\/\//i.test(e)) return e;
  try {
    const t = new URL(a.endsWith("/") ? a : `${a}/`).origin;
    return new URL(e.startsWith("/") ? e : `/${e}`, `${t}/`).href;
  } catch {
    return e;
  }
}
function f(a, e) {
  var s;
  const t = (s = e.stream) == null ? void 0 : s.url;
  if (!t) return e;
  const i = Ze(a, t);
  return !i || i === t ? e : {
    ...e,
    stream: { ...e.stream, url: i }
  };
}
const Xe = h`<svg class="icon icon--play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>`, et = h`<svg class="icon icon--pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>`, K = h`<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>`, Y = h`<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6h2v12h-2V6zM6 18V6l8.5 6L6 18z"/></svg>`, W = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>`, tt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>`, it = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" text-anchor="middle" fill="currentColor" stroke="none" font-size="8" font-weight="700">1</text></svg>`, st = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`, rt = h`<svg class="icon icon--spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`, nt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`, ot = h`<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`;
const at = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`, lt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/></svg>`, ut = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`, ht = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`, ct = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`, dt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`, pt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 6H3"/><path d="M21 6H15"/><path d="M21 12H11"/><path d="M21 18H3"/><path d="M7 12v6"/><path d="M7 6v2"/></svg>`, gt = h`<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.25"/><circle cx="15" cy="6" r="1.25"/><circle cx="9" cy="12" r="1.25"/><circle cx="15" cy="12" r="1.25"/><circle cx="9" cy="18" r="1.25"/><circle cx="15" cy="18" r="1.25"/></svg>`, mt = h`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>`, J = "om:favorites:v1";
class ft {
  constructor() {
    u(this, "slugs", /* @__PURE__ */ new Set());
    u(this, "listeners", /* @__PURE__ */ new Set());
    this.load(), typeof window < "u" && (window.addEventListener("storage", (e) => {
      e.key === J && (this.load(), this.notify());
    }), window.addEventListener("om:favorites-changed", () => {
      this.load(), this.notify();
    }));
  }
  load() {
    try {
      const e = localStorage.getItem(J);
      if (!e) return;
      const t = JSON.parse(e);
      this.slugs = new Set(t);
    } catch {
      this.slugs = /* @__PURE__ */ new Set();
    }
  }
  subscribe(e) {
    return this.listeners.add(e), () => this.listeners.delete(e);
  }
  notify() {
    this.listeners.forEach((e) => e());
  }
  isFavorite(e) {
    return e ? this.slugs.has(e) : !1;
  }
  toggle(e) {
    return this.slugs.has(e) ? this.slugs.delete(e) : this.slugs.add(e), localStorage.setItem(J, JSON.stringify([...this.slugs])), typeof window < "u" && window.dispatchEvent(new CustomEvent("om:favorites-changed")), this.notify(), this.slugs.has(e);
  }
  getAll() {
    return [...this.slugs];
  }
}
let Z = null;
function bt() {
  return Z || (Z = new ft()), Z;
}
const R = "om-audio-engine", vt = "om-persistent-root", X = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
class yt {
  constructor() {
    u(this, "audio", null);
    u(this, "track", null);
    u(this, "onTick", null);
    u(this, "onEnd", null);
    u(this, "tickTimer", null);
    u(this, "mediaHandlers", null);
    u(this, "pendingSeekMs", null);
    u(this, "volume", 0.85);
    u(this, "onLoadComplete", null);
    u(this, "lastPositionStateAt", 0);
    u(this, "mediaHandlersBound", !1);
    u(this, "loadAbort", null);
    u(this, "loadReady", Promise.resolve());
    u(this, "loadReadyResolve", null);
    u(this, "wiredAudio", null);
    u(this, "suppressSpuriousPause", !1);
    u(this, "onSpuriousPauseFn", null);
    u(this, "onPlaybackStartedFn", null);
    u(this, "onLoadErrorFn", null);
    u(this, "playbackUnlocked", !1);
    u(this, "playInFlight", null);
  }
  /** Call synchronously inside click/pointerdown — unlocks autoplay after async loads. */
  unlockUserGesture() {
    const e = this.acquireAudioElement();
    if (!e.paused && !e.ended) {
      this.markPlaybackUnlocked(e);
      return;
    }
    const t = e.currentSrc || e.src;
    if (t && t !== X) {
      this.markPlaybackUnlocked(e);
      return;
    }
    const i = e.muted;
    e.muted = !0;
    const s = (r) => {
      e.muted = i, r && this.markPlaybackUnlocked(e);
    };
    e.src = X, e.play().then(() => {
      e.paused || this.runIntentionalPause(() => {
        e.pause();
      }), e.currentSrc === X && (e.removeAttribute("src"), e.load()), s(!0);
    }).catch(() => s(!1));
  }
  isPlaybackUnlocked() {
    if (this.playbackUnlocked) return !0;
    const e = document.getElementById(R);
    return (e == null ? void 0 : e.dataset.omPlaybackUnlocked) === "1";
  }
  markPlaybackUnlocked(e) {
    this.playbackUnlocked = !0, e.dataset.omPlaybackUnlocked = "1";
  }
  clearPlaybackUnlocked(e) {
    this.playbackUnlocked = !1, delete e.dataset.omPlaybackUnlocked;
  }
  isNotAllowedError(e) {
    return e instanceof DOMException && e.name === "NotAllowedError";
  }
  safePlay(e) {
    return e.play().catch((t) => {
      if (this.isNotAllowedError(t)) {
        this.clearPlaybackUnlocked(e);
        return;
      }
      throw console.error("OmPlayer: play failed", t), t;
    });
  }
  /** Deduped play — prevents double-start glitches during Turbo navigation. */
  requestPlay(e) {
    return !e.paused && !e.ended ? Promise.resolve() : this.playInFlight ? this.playInFlight : (this.playInFlight = this.safePlay(e).then(() => {
      this.ensurePlaybackRunning();
    }).finally(() => {
      this.playInFlight = null;
    }), this.playInFlight);
  }
  runIntentionalPause(e) {
    this.suppressSpuriousPause = !0;
    try {
      e();
    } finally {
      queueMicrotask(() => {
        this.suppressSpuriousPause = !1;
      });
    }
  }
  beginLoadReady() {
    this.finishLoadReady(), this.loadReady = new Promise((e) => {
      this.loadReadyResolve = e;
    });
  }
  finishLoadReady() {
    var e;
    (e = this.loadReadyResolve) == null || e.call(this), this.loadReadyResolve = null;
  }
  waitUntilReady(e = 15e3) {
    return Promise.race([
      this.loadReady,
      new Promise((t) => window.setTimeout(t, e))
    ]);
  }
  play(e, t = 0) {
    this.load(e, t, !0);
  }
  /** Restart the current stream from the beginning without reloading src. */
  replayFromStart() {
    var t;
    const e = this.getActiveAudioElement();
    if (!(e != null && e.src)) return !1;
    this.stopTimer();
    try {
      e.currentTime = 0;
    } catch {
      return !1;
    }
    return this.safePlay(e).then(() => {
      this.ensurePlaybackRunning();
    }).catch(() => {
    }), (t = this.onTick) == null || t.call(this, 0), this.syncMediaSessionState(), !0;
  }
  load(e, t = 0, i = !0, s = !1) {
    var d, p, g, m, b;
    const r = (d = e.stream) == null ? void 0 : d.url;
    if (!r) {
      if (t === 0 && i && ((p = this.track) == null ? void 0 : p.slug) === e.slug && this.replayFromStart()) {
        this.finishLoadReady();
        return;
      }
      throw this.finishLoadReady(), new Error("No stream URL");
    }
    const n = this.acquireAudioElement();
    if (!s && t === 0 && i && n.ended && ((g = this.track) == null ? void 0 : g.slug) === e.slug && n.src && this.sameStreamUrl(n.src, r)) {
      this.track = e, this.replayFromStart(), this.finishLoadReady();
      return;
    }
    if (!s && this.shouldSkipReload(e, r, n, t)) {
      this.track = e, t > 0 && Math.abs(this.getPositionMs() - t) > 500 && (this.applySeek(t), (m = this.onTick) == null || m.call(this, this.getPositionMs())), i && n.paused && this.safePlay(n).catch(() => {
      }), this.finishLoadReady();
      return;
    }
    this.stopTimer(), (b = this.loadAbort) == null || b.abort(), this.loadAbort = new AbortController();
    const l = this.loadAbort.signal;
    this.beginLoadReady(), this.track = e, this.pendingSeekMs = t > 0 ? t : null, this.runIntentionalPause(() => {
      n.pause();
    }), n.volume = this.volume, n.preload = i ? "auto" : "metadata", n.src = r, this.audio = n;
    const o = () => {
      const v = this.pendingSeekMs ?? 0;
      this.pendingSeekMs = null;
      let oe = !1;
      const B = () => {
        var ae, le;
        oe || (oe = !0, i ? this.safePlay(n).then(() => {
          var M;
          n.paused && ((M = this.onTick) == null || M.call(this, this.getPositionMs()));
        }).catch(() => {
          var M;
          (M = this.onLoadErrorFn) == null || M.call(this, "Не удалось воспроизвести файл");
        }) : (ae = this.onTick) == null || ae.call(this, this.getPositionMs()), this.updateMediaSession(e), (le = this.onLoadComplete) == null || le.call(this), this.finishLoadReady());
      };
      v > 0 ? (this.applySeek(v), n.addEventListener("seeked", () => B(), { once: !0, signal: l }), window.setTimeout(B, 400)) : B();
    };
    n.addEventListener("loadedmetadata", o, { once: !0, signal: l }), n.load();
  }
  /** Keep the same element + position when the same track is requested again. */
  shouldSkipReload(e, t, i, s) {
    var l;
    if (!i.src || i.ended || i.error || ((l = this.track) == null ? void 0 : l.slug) !== e.slug) return !1;
    const r = this.getPositionMs();
    return r > 250 || i.currentTime > 0.25 ? !(s > 0 && Math.abs(r - s) > 2e3) : this.sameStreamUrl(i.src, t) ? !0 : !i.paused;
  }
  resolveAudioElement() {
    return document.getElementById(R);
  }
  bindAudioElement(e) {
    return this.audio !== e && (this.wireAudioElement(e), this.audio = e), e;
  }
  acquireAudioElement() {
    const e = this.resolveAudioElement();
    if (e)
      return this.bindAudioElement(e);
    const t = document.getElementById(vt) ?? document.getElementById("om-persistent-player") ?? document.documentElement, i = document.createElement("audio");
    return i.id = R, i.preload = "auto", i.setAttribute("playsinline", ""), i.hidden = !0, t.appendChild(i), this.bindAudioElement(i);
  }
  wireAudioElement(e) {
    this.wiredAudio !== e && (this.wiredAudio = e, e.addEventListener("ended", () => {
      var t;
      this.stopTimer(), (t = this.onEnd) == null || t.call(this);
    }), e.addEventListener("play", () => {
      var t;
      this.startTimer(), this.syncMediaSessionState(), (t = this.onPlaybackStartedFn) == null || t.call(this);
    }), e.addEventListener("pause", () => {
      var t;
      if (e.dataset.omNavigating === "1") {
        this.stopTimer();
        return;
      }
      this.stopTimer(), !this.suppressSpuriousPause && e.src && !e.ended && ((t = this.onSpuriousPauseFn) == null || t.call(this)), this.syncMediaSessionState();
    }), e.addEventListener("error", () => {
      var t;
      console.error("OmPlayer: audio error", e.src, e.error), (t = this.onLoadErrorFn) == null || t.call(this, "Аудиофайл недоступен"), this.finishLoadReady();
    }));
  }
  prepareForNewPlayback() {
    var t;
    this.stopTimer(), (t = this.loadAbort) == null || t.abort();
    const e = this.acquireAudioElement();
    this.runIntentionalPause(() => {
      e.pause();
    });
  }
  ensureAudioConnected() {
    const e = this.resolveAudioElement();
    e && this.bindAudioElement(e);
  }
  /** Read the live audio element — never moves it in the DOM. */
  peekAudioElement() {
    const e = this.resolveAudioElement();
    return e ? this.bindAudioElement(e) : this.audio ? this.audio : null;
  }
  getActiveAudioElement() {
    return this.ensureAudioConnected(), this.peekAudioElement();
  }
  /** Continue playback after Turbo briefly pauses the element during DOM updates. */
  resumeIfPaused() {
    const e = this.peekAudioElement();
    return !(e != null && e.src) || e.ended ? !1 : e.paused ? (this.requestPlay(e).catch(() => {
    }), !1) : !0;
  }
  ensurePlaybackRunning() {
    const e = this.peekAudioElement();
    !(e != null && e.src) || e.paused || (this.startTimer(), this.syncMediaSessionState());
  }
  onSpuriousPause(e) {
    this.onSpuriousPauseFn = e;
  }
  onPlaybackStarted(e) {
    this.onPlaybackStartedFn = e;
  }
  hasActivePlayback() {
    const e = this.audio ?? document.getElementById(R);
    return e != null && e.src ? this.isPlaying() || e.currentTime > 0.5 : !1;
  }
  getAudioElement() {
    return this.getActiveAudioElement();
  }
  toggleFromUserGesture() {
    const e = this.peekAudioElement();
    return e != null && e.src ? this.toggle() : null;
  }
  async playFromAction() {
    const e = this.peekAudioElement();
    if (!(e != null && e.src)) return !1;
    if (!e.paused) return !0;
    try {
      return await this.requestPlay(e), !e.paused;
    } catch {
      return !1;
    }
  }
  pauseFromAction() {
    const e = this.peekAudioElement();
    e && this.runIntentionalPause(() => {
      e.pause();
    });
  }
  toggle() {
    const e = this.peekAudioElement();
    return e ? e.paused ? (this.safePlay(e).catch(() => {
    }), !0) : (this.runIntentionalPause(() => {
      e.pause();
    }), !1) : !1;
  }
  pause() {
    const e = this.peekAudioElement();
    e && this.runIntentionalPause(() => {
      e.pause();
    });
  }
  previewSeek(e) {
    var t;
    this.audio && (this.applySeek(this.clampMs(e)), (t = this.onTick) == null || t.call(this, this.getPositionMs()));
  }
  seek(e) {
    if (!this.audio) return;
    const t = this.clampMs(e), i = this.audio, s = () => {
      var r;
      this.applySeek(t), (r = this.onTick) == null || r.call(this, this.getPositionMs()), this.syncMediaSessionState();
    };
    if (i.readyState >= HTMLMediaElement.HAVE_METADATA) {
      s();
      return;
    }
    this.pendingSeekMs = t, i.addEventListener("loadedmetadata", s, { once: !0 });
  }
  sameStreamUrl(e, t) {
    if (e === t) return !0;
    try {
      const i = new URL(e, window.location.href), s = new URL(t, window.location.href);
      return i.pathname === s.pathname;
    } catch {
      return e.endsWith(t) || t.endsWith(e);
    }
  }
  clampMs(e) {
    const t = this.getDurationMs(), i = t > 0 ? t : e;
    return Math.max(0, Math.min(e, i));
  }
  applySeek(e) {
    if (!this.audio) return;
    const t = e / 1e3;
    if (Number.isFinite(t))
      try {
        this.audio.currentTime = t;
      } catch {
      }
  }
  setVolume(e) {
    this.volume = Math.max(0, Math.min(1, e)), this.audio && (this.audio.volume = this.volume);
  }
  getPositionMs() {
    return !this.audio || !Number.isFinite(this.audio.currentTime) ? 0 : Math.floor(this.audio.currentTime * 1e3);
  }
  getDurationMs() {
    var e;
    return this.audio && Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? Math.floor(this.audio.duration * 1e3) : ((e = this.track) == null ? void 0 : e.durationMs) ?? 0;
  }
  isPlaying() {
    const e = this.peekAudioElement();
    return !!e && !e.paused && !e.ended;
  }
  getCurrentTrack() {
    return this.track;
  }
  onPosition(e) {
    this.onTick = e;
  }
  onLoaded(e) {
    this.onLoadComplete = e;
  }
  onFinished(e) {
    this.onEnd = e;
  }
  onLoadError(e) {
    this.onLoadErrorFn = e;
  }
  hasPlayableSource() {
    const e = this.peekAudioElement();
    return !!(e != null && e.src && !e.error && e.readyState >= HTMLMediaElement.HAVE_METADATA);
  }
  setMediaHandlers(e) {
    this.mediaHandlers = e;
  }
  primeMediaSession(e, t, i) {
    "mediaSession" in navigator && (navigator.mediaSession.metadata = new MediaMetadata({ title: e, artist: t, album: "OmPlayer" }), navigator.mediaSession.playbackState = i ? "playing" : "paused");
  }
  startTimer() {
    this.stopTimer(), this.tickTimer = window.setInterval(() => {
      var e;
      (e = this.onTick) == null || e.call(this, this.getPositionMs()), this.syncMediaSessionState(!0);
    }, 250);
  }
  stopTimer() {
    this.tickTimer && (clearInterval(this.tickTimer), this.tickTimer = null);
  }
  safeAction(e, t) {
    if ("mediaSession" in navigator)
      try {
        navigator.mediaSession.setActionHandler(e, t);
      } catch {
      }
  }
  bindMediaSessionHandlers() {
    if (!("mediaSession" in navigator) || this.mediaHandlersBound) return;
    const e = () => this.mediaHandlers;
    this.safeAction("play", () => {
      var t;
      return (t = e()) == null ? void 0 : t.onPlay();
    }), this.safeAction("pause", () => {
      var t;
      return (t = e()) == null ? void 0 : t.onPause();
    }), this.safeAction("stop", () => {
      var t;
      return (t = e()) == null ? void 0 : t.onStop();
    }), this.safeAction("nexttrack", () => {
      var t;
      return (t = e()) == null ? void 0 : t.onNext();
    }), this.safeAction("previoustrack", () => {
      var t;
      return (t = e()) == null ? void 0 : t.onPrev();
    }), this.safeAction("seekto", (t) => {
      (t == null ? void 0 : t.seekTime) != null && this.seek(Math.floor(t.seekTime * 1e3));
    }), this.safeAction("seekbackward", (t) => {
      const i = (t == null ? void 0 : t.seekOffset) ?? 10;
      this.seek(Math.max(0, this.getPositionMs() - i * 1e3));
    }), this.safeAction("seekforward", (t) => {
      const i = (t == null ? void 0 : t.seekOffset) ?? 10;
      this.seek(this.getPositionMs() + i * 1e3);
    }), this.mediaHandlersBound = !0;
  }
  syncMediaSessionState(e = !1) {
    if (!("mediaSession" in navigator)) return;
    const t = navigator.mediaSession;
    if (t.playbackState = this.isPlaying() ? "playing" : this.audio ? "paused" : "none", !this.audio || !("setPositionState" in t)) return;
    const i = this.getDurationMs() / 1e3, s = this.getPositionMs() / 1e3;
    if (i <= 0 || !Number.isFinite(i) || !Number.isFinite(s)) return;
    const r = Date.now();
    if (!(e && r - this.lastPositionStateAt < 900)) {
      this.lastPositionStateAt = r;
      try {
        t.setPositionState({
          duration: i,
          playbackRate: this.audio.playbackRate || 1,
          position: Math.min(Math.max(0, s), i)
        });
      } catch {
      }
    }
  }
  updateMediaSession(e) {
    if (!("mediaSession" in navigator)) return;
    const t = [];
    e.coverUrl && t.push({ src: e.coverUrl, sizes: "512x512", type: "image/jpeg" }), e.coverThumbUrl && e.coverThumbUrl !== e.coverUrl && t.push({ src: e.coverThumbUrl, sizes: "128x128", type: "image/jpeg" }), navigator.mediaSession.metadata = new MediaMetadata({
      title: e.title,
      artist: e.artistName,
      album: e.albumTitle ?? "",
      artwork: t
    }), this.bindMediaSessionHandlers(), this.syncMediaSessionState();
  }
}
const kt = "om-player-sync";
class xt {
  constructor() {
    u(this, "tabId");
    u(this, "channel", null);
    u(this, "pauseListeners", /* @__PURE__ */ new Set());
    let e = sessionStorage.getItem("om:tab-id");
    e || (e = crypto.randomUUID(), sessionStorage.setItem("om:tab-id", e)), this.tabId = e, "BroadcastChannel" in window && (this.channel = new BroadcastChannel(kt), this.channel.onmessage = (t) => {
      const i = t.data;
      i.tabId !== this.tabId && i.type === "pause-others" && this.pauseListeners.forEach((s) => s());
    });
  }
  onRemotePause(e) {
    return this.pauseListeners.add(e), () => this.pauseListeners.delete(e);
  }
  /** Call before starting playback — pauses audio in other tabs. */
  announcePlayback() {
    var e;
    (e = this.channel) == null || e.postMessage({ type: "pause-others", tabId: this.tabId });
  }
}
let ee = null;
function wt() {
  return ee || (ee = new xt()), ee;
}
const ke = "om:playback:v1", xe = "om:session-id";
class Pt {
  constructor() {
    u(this, "engine", new yt());
    u(this, "queue", []);
    u(this, "queueIndex", 0);
    u(this, "volume", 0.85);
    u(this, "repeat", "off");
    u(this, "shuffle", !1);
    u(this, "originalQueue", []);
    u(this, "sessionId");
    u(this, "tabs", wt());
    u(this, "listeners", /* @__PURE__ */ new Set());
    u(this, "restoringPositionMs", null);
    u(this, "restoreFn", null);
    u(this, "persistTimer", null);
    u(this, "wasPlayingBeforeNav", !1);
    u(this, "navigationPlaybackLock", !1);
    u(this, "navigationSnapshotMs", 0);
    u(this, "shouldResumeAfterNav", !1);
    u(this, "intendedPlaying", !1);
    u(this, "lastKnownPositionMs", 0);
    this.sessionId = localStorage.getItem(xe) ?? crypto.randomUUID(), localStorage.setItem(xe, this.sessionId);
    const e = this.loadSaved();
    e != null && e.volume && (this.volume = e.volume), e != null && e.repeat && (this.repeat = e.repeat), e != null && e.shuffle && (this.shuffle = e.shuffle), (e == null ? void 0 : e.positionMs) > 1e3 && (this.lastKnownPositionMs = e.positionMs), e != null && e.trackSlug && this.engine.primeMediaSession(
      e.trackTitle ?? e.trackSlug,
      e.artistName ?? "OmPlayer",
      e.wasPlaying === !0
    ), this.engine.setVolume(this.volume), this.engine.onSpuriousPause(() => {
    }), this.engine.onPlaybackStarted(() => {
      this.isNavigatingPlayback() || (this.markPlaybackIntent(), this.notify());
    }), this.engine.onFinished(() => this.onTrackEnd()), this.engine.onPosition(() => {
      const t = this.getPositionMs();
      t > 500 && (this.lastKnownPositionMs = t), this.isNavigatingPlayback() || this.persist();
    }), this.engine.onLoaded(() => {
      const t = this.restoringPositionMs;
      if (t !== null && t > 1e3) {
        const s = () => {
          const r = this.getPositionMs();
          if (r > 1e3 || Math.abs(r - t) < 2500) {
            this.restoringPositionMs = null, r > 500 && (this.lastKnownPositionMs = r), this.persist(), this.notify();
            return;
          }
          window.setTimeout(s, 60);
        };
        window.setTimeout(s, 0);
        return;
      }
      this.restoringPositionMs = null;
      const i = this.getPositionMs();
      i > 500 && (this.lastKnownPositionMs = i), this.persist(), this.notify();
    }), this.engine.onLoadError(() => {
      this.clearPlaybackIntent(), this.notify();
    }), this.engine.setMediaHandlers({
      onNext: () => this.next(),
      onPrev: () => this.prev(),
      onPlay: () => {
        this.handleMediaPlay();
      },
      onPause: () => {
        this.handleMediaPause();
      },
      onStop: () => {
        this.handleMediaStop();
      }
    }), this.restoreFn = () => this.restoreViaGlobalPlayer(), this.tabs.onRemotePause(() => {
      this.clearPlaybackIntent(), this.engine.pause(), this.notify();
    }), this.wireAudioNavigationGuard(), document.addEventListener("turbo:click", () => {
      this.captureNavigationIntent();
    }, !0), window.addEventListener("pagehide", () => this.persist(!0, !0)), window.addEventListener("beforeunload", () => this.persist(!0, !0)), window.addEventListener("turbo:before-visit", () => {
      this.captureNavigationIntent(), this.persist(!0, !0);
    }), window.addEventListener("turbo:load", () => {
      this.wireAudioNavigationGuard(), this.completeNavigationQuietly();
    });
  }
  resolvePersistedPosition(e) {
    if (e > 1e3)
      return this.lastKnownPositionMs = e, e;
    if (this.restoringPositionMs !== null && this.restoringPositionMs > 1e3)
      return this.restoringPositionMs;
    if (this.lastKnownPositionMs > 1e3)
      return this.lastKnownPositionMs;
    const t = this.engine.getCurrentTrack(), i = this.loadSaved();
    return i != null && i.trackSlug && (t == null ? void 0 : t.slug) === i.trackSlug && i.positionMs > 1e3 ? i.positionMs : e;
  }
  syncSavedPlaybackPosition() {
    if (this.isNavigatingPlayback() || this.isPlaying() || this.intendedPlaying) return;
    const e = this.engine.peekAudioElement(), t = this.loadSaved(), i = this.engine.getCurrentTrack();
    if (!(e != null && e.src) || e.ended || !(t != null && t.trackSlug) || !i || i.slug !== t.trackSlug || !e.paused) return;
    const s = this.getPositionMs();
    t.positionMs > 1500 && s < 1e3 && (this.engine.seek(t.positionMs), this.lastKnownPositionMs = t.positionMs);
  }
  isNavigatingPlayback() {
    return this.wasPlayingBeforeNav || this.navigationPlaybackLock;
  }
  markPlaybackIntent() {
    this.intendedPlaying = !0;
  }
  clearPlaybackIntent() {
    this.intendedPlaying = !1, this.clearNavigationLock();
  }
  clearNavigationLock() {
    this.wasPlayingBeforeNav = !1, this.navigationPlaybackLock = !1, this.shouldResumeAfterNav = !1, this.navigationSnapshotMs = 0, this.setNavigatingAudioFlag(!1);
  }
  setNavigatingAudioFlag(e) {
    const t = this.engine.peekAudioElement();
    t && (e ? t.dataset.omNavigating = "1" : delete t.dataset.omNavigating);
  }
  /** Active playback that must not be interrupted by restore/reload. */
  hasActiveSession() {
    const e = this.engine.peekAudioElement();
    return !this.engine.getCurrentTrack() || !(e != null && e.src) || e.ended || e.error ? !1 : this.isNavigatingPlayback() || this.isPlaying() || this.intendedPlaying ? !0 : e.currentTime > 0.25 || this.engine.getPositionMs() > 250;
  }
  isNavigating() {
    return this.isNavigatingPlayback();
  }
  completeNavigation() {
    this.finalizeNavigationPlayback();
  }
  repairNavigationPositionPublic() {
    this.repairNavigationPositionBeforeResume(), this.notify();
  }
  captureNavigationIntent(e = !1) {
    const t = this.engine.peekAudioElement();
    if (!(t != null && t.src) || t.ended) return;
    const i = this.engine.getPositionMs(), s = Math.max(i, this.lastKnownPositionMs, Math.round(t.currentTime * 1e3));
    if (!(this.isPlaying() || this.intendedPlaying || s > 250 || t.currentTime > 0.25)) return;
    this.shouldResumeAfterNav = this.isPlaying() || this.intendedPlaying, this.wasPlayingBeforeNav = !0, this.navigationPlaybackLock = !0;
    const n = Math.max(s, this.lastKnownPositionMs);
    n > 250 && (this.navigationSnapshotMs = n, this.lastKnownPositionMs = n), this.setNavigatingAudioFlag(!0);
  }
  isLivePlayback() {
    const e = this.engine.peekAudioElement();
    return !(e != null && e.src) || e.ended ? !1 : this.isPlaying() || e.currentTime > 0.25;
  }
  setRestoreHandler(e) {
    this.restoreFn = e;
  }
  async restoreViaGlobalPlayer() {
    var t;
    await customElements.whenDefined("om-player");
    const e = document.getElementById("om-global");
    await ((t = e == null ? void 0 : e.restoreSessionPublic) == null ? void 0 : t.call(e));
  }
  async ensureRestored() {
    if (this.hasActiveSession()) return;
    const e = this.engine.peekAudioElement();
    if (!(this.engine.getCurrentTrack() && (e != null && e.src) && !e.error && this.engine.hasPlayableSource())) {
      if (this.restoreFn) {
        await this.restoreFn();
        return;
      }
      await this.restoreViaGlobalPlayer();
    }
  }
  /**
   * Yandex-style navigation: never touch audio while Turbo runs.
   * Resume only as a last resort if the browser genuinely paused the element.
   */
  async completeNavigationQuietly() {
    if (!this.isNavigatingPlayback()) {
      this.notify();
      return;
    }
    await new Promise((t) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => t()));
    });
    const e = this.engine.peekAudioElement();
    if (e != null && e.src && !e.paused && !e.ended) {
      this.finalizeNavigationPlayback();
      return;
    }
    if (this.shouldResumeAfterNav && (e != null && e.src) && e.paused && !e.ended) {
      const t = Math.round(e.currentTime * 1e3), i = Math.max(this.navigationSnapshotMs, this.lastKnownPositionMs);
      t < 30 && i > t + 2e3 && this.engine.seek(i), await this.engine.playFromAction();
    }
    this.finalizeNavigationPlayback();
  }
  finalizeNavigationPlayback() {
    const e = this.engine.peekAudioElement();
    e != null && e.src && !e.paused && !e.ended && this.markPlaybackIntent(), this.clearNavigationLock(), window.requestAnimationFrame(() => this.persist()), this.notify();
  }
  /**
   * Seek only when Turbo clearly zeroed currentTime.
   * Must run while paused and before play() — never seek during playback.
   */
  repairNavigationPositionBeforeResume() {
    var r;
    const e = this.engine.peekAudioElement();
    if (!(e != null && e.src) || e.ended || !e.paused) return;
    const t = Math.round(e.currentTime * 1e3);
    if (t > 30) return;
    const i = ((r = this.loadSaved()) == null ? void 0 : r.positionMs) ?? 0, s = Math.max(this.navigationSnapshotMs, this.lastKnownPositionMs, i);
    s < t + 3e3 || (this.engine.seek(s), this.lastKnownPositionMs = s);
  }
  wireAudioNavigationGuard() {
    const e = document.getElementById("om-audio-engine");
    !e || e.dataset.omNavGuard === "1" || (e.dataset.omNavGuard = "1", e.addEventListener("play", () => this.markPlaybackIntent()));
  }
  subscribe(e) {
    return this.listeners.add(e), () => this.listeners.delete(e);
  }
  notify() {
    this.listeners.forEach((e) => e());
  }
  loadSaved() {
    try {
      let e = localStorage.getItem(ke);
      if (e || (e = localStorage.getItem("jmo:playback:v1")), !e) return null;
      const t = JSON.parse(e);
      return Date.now() - new Date(t.updatedAt).getTime() > 7 * 864e5 ? null : t;
    } catch {
      return null;
    }
  }
  shouldAutoplayRestore(e) {
    return !1;
  }
  playTrack(e, t = 0, i = !1) {
    this.loadTrack(e, t, !0, i);
  }
  loadTrack(e, t = 0, i = !0, s = !1) {
    i && this.markPlaybackIntent();
    try {
      this.loadTrackInternal(e, t, i, s);
    } catch {
      throw this.clearPlaybackIntent(), this.notify(), new Error("No stream URL");
    }
  }
  loadTrackInternal(e, t, i, s) {
    i && this.tabs.announcePlayback(), this.queue = [e], this.originalQueue = [e], this.queueIndex = 0, this.restoringPositionMs = t > 0 ? t : null, this.engine.load(e, t, i, s), this.emit(i ? "om:play" : "om:session-restore", e), this.notify();
  }
  setQueue(e, t = 0, i = 0, s = !0, r = !1) {
    var p;
    const n = (p = this.engine.getCurrentTrack()) == null ? void 0 : p.slug;
    r && this.engine.prepareForNewPlayback(), this.originalQueue = [...e], this.queue = this.shuffle ? this.shuffledCopy(e) : [...e], this.queueIndex = t;
    const l = this.queue[t];
    if (!l) return;
    let o = i;
    !r && i === 0 && l.slug === n && this.getPositionMs() > 1e3 && (o = this.getPositionMs());
    const d = this.engine.peekAudioElement();
    if (!r && l.slug === n && (d != null && d.src) && this.hasActiveSession() && (o === 0 || Math.abs(this.getPositionMs() - o) < 2500)) {
      s && !this.isPlaying() && (this.tabs.announcePlayback(), this.engine.playFromAction()), this.notify();
      return;
    }
    s && this.tabs.announcePlayback(), this.restoringPositionMs = o > 0 ? o : null;
    try {
      this.engine.load(l, o, s, r);
    } catch {
      throw this.clearPlaybackIntent(), this.notify(), new Error("No stream URL");
    }
    this.emit(s ? "om:play" : "om:session-restore", l), this.notify();
  }
  restoreQueue(e, t, i, s, r = !0) {
    var d;
    const n = t[i];
    if (!n) return;
    const l = (d = this.engine.getCurrentTrack()) == null ? void 0 : d.slug, o = this.engine.peekAudioElement();
    if (n.slug === l && (o != null && o.src) && this.hasActiveSession() && Math.abs(this.getPositionMs() - s) < 2500) {
      this.originalQueue = [...e], this.queue = [...t], this.queueIndex = i, this.notify();
      return;
    }
    r && this.tabs.announcePlayback(), this.originalQueue = [...e], this.queue = [...t], this.queueIndex = i, this.restoringPositionMs = s > 0 ? s : null, this.engine.load(n, s, r), this.emit(r ? "om:play" : "om:session-restore", n), this.notify();
  }
  toggle() {
    this.isPlaying() || this.tabs.announcePlayback();
    const t = this.engine.toggle();
    t ? this.markPlaybackIntent() : this.clearPlaybackIntent(), this.emit(t ? "om:play" : "om:pause", this.engine.getCurrentTrack()), this.persist(!t), this.notify();
  }
  toggleFromUserGesture() {
    this.isPlaying() || this.tabs.announcePlayback();
    const t = this.engine.toggleFromUserGesture();
    return t === null ? null : (t ? this.markPlaybackIntent() : this.clearPlaybackIntent(), this.emit(t ? "om:play" : "om:pause", this.engine.getCurrentTrack()), this.persist(!t), this.notify(), t);
  }
  async handleMediaPlay() {
    await this.ensureRestored(), !(!this.engine.getCurrentTrack() || (await this.engine.waitUntilReady(), this.isPlaying()) || (this.tabs.announcePlayback(), !await this.engine.playFromAction())) && (this.emit("om:play", this.engine.getCurrentTrack()), this.persist(), this.notify());
  }
  async handleMediaPause() {
    await this.ensureRestored(), this.engine.getCurrentTrack() && (await this.engine.waitUntilReady(), this.isPlaying() && (this.engine.pauseFromAction(), this.clearPlaybackIntent(), this.emit("om:pause", this.engine.getCurrentTrack()), this.persist(!0), this.notify()));
  }
  async handleMediaStop() {
    await this.ensureRestored(), this.engine.getCurrentTrack() && (await this.engine.waitUntilReady(), this.isPlaying() && this.engine.pauseFromAction(), this.getPositionMs() > 0 && this.seek(0), this.clearPlaybackIntent(), this.emit("om:pause", this.engine.getCurrentTrack()), this.persist(!0), this.notify());
  }
  waitUntilReady() {
    return this.engine.waitUntilReady();
  }
  onTrackEnd() {
    if (this.repeat === "one") {
      if (this.tabs.announcePlayback(), this.markPlaybackIntent(), this.engine.replayFromStart()) {
        this.persist(), this.notify();
        return;
      }
      const e = this.engine.getCurrentTrack() ?? this.queue[this.queueIndex];
      e && (this.engine.load(e, 0, !0, !0), this.persist(), this.notify());
      return;
    }
    if (this.queueIndex < this.queue.length - 1) {
      this.next();
      return;
    }
    if (this.repeat === "all" && this.queue.length > 0) {
      this.tabs.announcePlayback(), this.queueIndex = 0, this.engine.play(this.queue[0], 0), this.emit("om:track-change", this.queue[0]), this.notify();
      return;
    }
    this.emit("om:queue-end", this.engine.getCurrentTrack()), this.notify();
  }
  next() {
    if (this.queueIndex < this.queue.length - 1) {
      this.tabs.announcePlayback(), this.queueIndex += 1;
      const e = this.queue[this.queueIndex];
      this.engine.play(e), this.persist(), this.emit("om:track-change", e), this.emit("om:skip", e), this.notify();
    } else this.repeat === "all" && this.queue.length > 0 && (this.tabs.announcePlayback(), this.queueIndex = 0, this.engine.play(this.queue[0], 0), this.emit("om:track-change", this.queue[0]), this.notify());
  }
  prev() {
    if (this.getPositionMs() > 3e3) {
      this.engine.seek(0);
      return;
    }
    if (this.queueIndex > 0) {
      this.tabs.announcePlayback(), this.queueIndex -= 1;
      const e = this.queue[this.queueIndex];
      this.engine.play(e), this.persist(), this.emit("om:track-change", e), this.notify();
    }
  }
  previewSeek(e) {
    this.engine.previewSeek(e), this.notify();
  }
  seek(e) {
    this.engine.seek(e), this.persist(), this.emit("om:seek", this.engine.getCurrentTrack()), this.notify();
  }
  setVolume(e) {
    this.volume = e, this.engine.setVolume(e), this.persist(), this.notify();
  }
  cycleRepeat() {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off", this.persist(), this.notify();
  }
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    const e = this.engine.getCurrentTrack();
    if (this.shuffle && this.originalQueue.length > 1) {
      const t = this.originalQueue.filter((i) => i.slug !== (e == null ? void 0 : e.slug));
      for (let i = t.length - 1; i > 0; i--) {
        const s = Math.floor(Math.random() * (i + 1));
        [t[i], t[s]] = [t[s], t[i]];
      }
      this.queue = e ? [e, ...t] : this.shuffledCopy(this.originalQueue), this.queueIndex = 0;
    } else
      this.queue = [...this.originalQueue], this.queueIndex = e ? this.queue.findIndex((t) => t.slug === e.slug) : 0, this.queueIndex < 0 && (this.queueIndex = 0);
    this.persist(), this.notify();
  }
  getPositionMs() {
    const e = this.engine.getPositionMs();
    if (this.isNavigatingPlayback() && e < 500) {
      if (this.navigationSnapshotMs > 500) return this.navigationSnapshotMs;
      if (this.lastKnownPositionMs > 500) return this.lastKnownPositionMs;
    }
    return e;
  }
  getDurationMs() {
    return this.engine.getDurationMs();
  }
  isPlaying() {
    return this.engine.isPlaying();
  }
  getCurrentTrack() {
    return this.engine.getCurrentTrack();
  }
  hasInQueue(e) {
    return this.queue.some((t) => t.slug === e);
  }
  queueIndexOf(e) {
    return this.queue.findIndex((t) => t.slug === e);
  }
  removeBySlug(e) {
    const t = this.queueIndexOf(e);
    return t < 0 ? !1 : (this.removeAt(t), !0);
  }
  moveQueueItem(e, t) {
    if (e === t || e < 0 || t < 0 || e >= this.queue.length) return;
    const i = this.queue[e];
    this.queue.splice(e, 1);
    const s = Math.max(0, Math.min(t, this.queue.length));
    this.queue.splice(s, 0, i);
    const r = this.engine.getCurrentTrack();
    if (r) {
      const n = this.queue.findIndex((l) => l.slug === r.slug);
      n >= 0 && (this.queueIndex = n);
    }
    this.shuffle || (this.originalQueue = [...this.queue]), this.persist(), this.notify();
  }
  addToQueue(e) {
    return this.hasInQueue(e.slug) ? !1 : (this.originalQueue.push(e), this.queue.push(e), this.persist(), this.notify(), !0);
  }
  playNext(e) {
    const t = this.queueIndexOf(e.slug), i = this.engine.getCurrentTrack();
    if (t >= 0) {
      if (t === this.queueIndex) return !1;
      const r = this.queueIndex + 1;
      return t !== r && this.moveQueueItem(t, r), !0;
    }
    if (!i || this.queue.length === 0)
      return this.loadTrack(e, 0, !0), !0;
    const s = this.queueIndex + 1;
    return this.queue.splice(s, 0, e), this.shuffle ? this.originalQueue.push(e) : this.originalQueue = [...this.queue], this.persist(), this.notify(), !0;
  }
  removeAt(e) {
    if (e < 0 || e >= this.queue.length) return;
    const t = this.queue[e];
    this.queue.splice(e, 1);
    const i = this.originalQueue.findIndex((s) => s.slug === t.slug);
    if (i >= 0 && this.originalQueue.splice(i, 1), this.queue.length === 0) {
      this.queueIndex = 0, this.engine.pause(), this.clearPlaybackIntent(), this.persist(), this.notify();
      return;
    }
    if (e < this.queueIndex)
      this.queueIndex -= 1;
    else if (e === this.queueIndex) {
      this.queueIndex >= this.queue.length && (this.queueIndex = this.queue.length - 1);
      const s = this.queue[this.queueIndex];
      s && (this.tabs.announcePlayback(), this.engine.play(s, 0), this.emit("om:track-change", s));
    }
    this.persist(), this.notify();
  }
  clearQueue() {
    const e = this.engine.getCurrentTrack();
    e ? (this.queue = [e], this.originalQueue = [e], this.queueIndex = 0) : (this.queue = [], this.originalQueue = [], this.queueIndex = 0), this.persist(), this.notify();
  }
  shuffledCopy(e) {
    const t = [...e];
    for (let i = t.length - 1; i > 0; i--) {
      const s = Math.floor(Math.random() * (i + 1));
      [t[i], t[s]] = [t[s], t[i]];
    }
    return t;
  }
  persist(e = !1, t = !1) {
    if (e) {
      this.persistTimer !== null && (clearTimeout(this.persistTimer), this.persistTimer = null), this.writeSaved(t);
      return;
    }
    this.persistTimer === null && (this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null, this.writeSaved();
    }, 800));
  }
  writeSaved(e = !1) {
    const t = this.engine.getCurrentTrack();
    let i = this.engine.getPositionMs();
    this.isNavigatingPlayback() && i < 500 && this.navigationSnapshotMs > 500 && (i = this.navigationSnapshotMs);
    const s = this.resolvePersistedPosition(i), r = {
      trackSlug: (t == null ? void 0 : t.slug) ?? null,
      albumSlug: (t == null ? void 0 : t.albumSlug) ?? null,
      queueSlugs: this.queue.map((n) => n.slug),
      queueIndex: this.queueIndex,
      positionMs: s,
      volume: this.volume,
      repeat: this.repeat,
      shuffle: this.shuffle,
      wasPlaying: e ? this.isNavigatingPlayback() || this.isPlaying() : this.isPlaying(),
      trackTitle: (t == null ? void 0 : t.title) ?? null,
      artistName: (t == null ? void 0 : t.artistName) ?? null,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    localStorage.setItem(ke, JSON.stringify(r));
  }
  emit(e, t) {
    window.dispatchEvent(new CustomEvent(e, { detail: { track: t, store: this } }));
  }
}
let te = null;
function $t() {
  return te || (te = new Pt()), te;
}
function q(a) {
  return h`
    <div class="viz${a ? " viz--active" : ""}" aria-hidden="true">
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
      <span class="viz__bar"></span>
    </div>
  `;
}
const qt = ':host{--om-font: "Montserrat", system-ui, sans-serif;--om-radius: 14px;--om-radius-sm: 10px;--om-ease: cubic-bezier(.4, 0, .2, 1);--om-header-offset: 88px;display:block;font-family:var(--om-font);color:var(--om-text-primary);-webkit-font-smoothing:antialiased;scrollbar-width:thin;scrollbar-color:var(--om-accent-soft) transparent}:host ::-webkit-scrollbar{width:6px;height:6px}:host ::-webkit-scrollbar-track{background:transparent}:host ::-webkit-scrollbar-thumb{background:var(--om-accent-soft);border-radius:999px}:host ::-webkit-scrollbar-thumb:hover{background:var(--om-accent)}:host([theme="light"]),:host(:not([theme])),:host([theme="om"]){--om-text-primary: #2a2622;--om-text-secondary: #4a443c;--om-text-muted: #7a7268;--om-accent: #4a7c59;--om-accent-hover: #3d6649;--om-accent-soft: rgba(74, 124, 89, .14);--om-border: rgba(42, 38, 34, .1);--om-progress-bg: rgba(42, 38, 34, .1);--om-progress-fill: #4a7c59;--om-surface: #fffcf8;--om-surface-elevated: #f7f4ef}:host([theme="dark"]){--om-text-primary: #f5f5f0;--om-text-secondary: #d0ccc4;--om-text-muted: #a8a098;--om-accent: #6b9b7a;--om-accent-hover: #7fb08d;--om-accent-soft: rgba(107, 155, 122, .18);--om-border: rgba(255, 255, 255, .08);--om-progress-bg: rgba(255, 255, 255, .12);--om-progress-fill: #6b9b7a;--om-surface: #1a1a18;--om-surface-elevated: #242422}:host([mode="mini"]){--om-text-primary: #f5f5f2;--om-text-secondary: #c8c8c0;--om-text-muted: #8e8e88;--om-accent: #ffffff;--om-accent-hover: #e8e8e4;--om-accent-soft: rgba(255, 255, 255, .12);--om-border: rgba(255, 255, 255, .08);--om-progress-bg: rgba(255, 255, 255, .14);--om-progress-fill: #ffffff;--om-surface: rgba(20, 20, 22, .8);--om-surface-elevated: rgba(28, 28, 31, .85)}.icon--play{transform:translate(1.5px)}.icon--pause{transform:scale(.92)}.icon{width:18px;height:18px;display:block;flex-shrink:0;pointer-events:none}.icon--spin{animation:om-spin .75s linear infinite}@keyframes om-spin{to{transform:rotate(360deg)}}.player{background:var(--om-surface);border:1px solid var(--om-border);border-radius:var(--om-radius)}.player--hidden{display:none}:host([mode="mini"]) .player--mini{overflow:hidden;box-shadow:0 12px 40px #00000047;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}.mini-row{display:grid;grid-template-columns:48px minmax(0,.85fr) minmax(96px,1.5fr) auto auto auto;align-items:center;gap:8px 10px;padding:8px 14px}.mini-toolbar{display:flex;align-items:center;gap:0;flex-shrink:0}.mini-toolbar .controls{display:flex;align-items:center;gap:2px}:host([mode="mini"]) .mini-row .cover--sm{width:48px;height:48px}.mini-options{display:flex;align-items:center;gap:0;flex-shrink:0}:host([mode="mini"]) .mini-options .btn{width:32px;height:32px}:host([mode="mini"]) .mini-options .icon{width:16px;height:16px}.cover{object-fit:cover;background:var(--om-accent-soft);flex-shrink:0}.cover--sm{width:52px;height:52px;border-radius:8px}.cover--md{width:64px;height:64px;border-radius:10px}.cover--lg{width:100%;max-width:300px;aspect-ratio:1;height:auto;border-radius:12px;box-shadow:0 20px 50px #0000002e}.meta{min-width:0}.title{font-weight:600;font-size:.9375rem;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.artist{margin-top:2px;font-size:.8125rem;color:var(--om-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.controls{display:flex;align-items:center;gap:2px}.controls--center{justify-content:center;gap:4px;margin-top:4px}.btn{border:none;background:transparent;color:var(--om-text-secondary);width:36px;height:36px;border-radius:50%;cursor:pointer;display:grid;place-items:center;transition:background .18s var(--om-ease),color .18s var(--om-ease),transform .18s var(--om-ease)}.btn:hover{background:var(--om-accent-soft);color:var(--om-text-primary)}.btn.is-active{color:var(--om-accent);background:var(--om-accent-soft)}.btn--play{width:40px;height:40px;color:var(--om-text-primary)}.btn--play-lg{width:52px;height:52px;background:var(--om-accent);color:#fff}:host([mode="mini"]) .btn--play{background:#fff;color:#121214}:host([mode="mini"]) .btn--play:hover:not(:disabled){background:#e8e8e4;transform:scale(1.04)}.btn--play:disabled,.btn--play-lg:disabled{opacity:.55;cursor:wait;transform:none}.btn--play-lg:hover{background:var(--om-accent-hover);transform:scale(1.03)}.btn--play .icon{width:20px;height:20px}.btn--play-lg .icon{width:22px;height:22px}.progress-wrap{display:flex;align-items:center;gap:10px;padding:0 16px 12px}.progress-track{position:relative;flex:1;height:20px;display:flex;align-items:center;touch-action:none;cursor:pointer;-webkit-user-select:none;user-select:none}.progress-rail{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:4px;border-radius:999px;background:var(--om-progress-bg);pointer-events:none}.progress-fill{position:absolute;left:0;top:50%;transform:translateY(-50%);height:4px;border-radius:999px;background:var(--om-progress-fill);pointer-events:none;max-width:100%;z-index:1;will-change:width}.progress-thumb{position:absolute;top:50%;left:0;width:12px;height:12px;border-radius:50%;background:var(--om-progress-fill);transform:translate(-50%,-50%);pointer-events:none;z-index:2;box-shadow:0 0 0 0 transparent;will-change:left}.progress-wrap.is-scrubbing .progress-thumb,.progress-track:hover .progress-thumb{box-shadow:0 0 0 4px var(--om-accent-soft);transform:translate(-50%,-50%) scale(1.05);transition:box-shadow .15s ease,transform .15s ease}.progress-wrap.is-scrubbing .progress-fill{transition:none}.progress-wrap--readonly .progress-track{cursor:default;opacity:.72}.progress-wrap--readonly .progress-thumb{opacity:.5}.progress-wrap--compact{padding:0 16px 10px}:host([mode="mini"]) .progress-wrap--compact{padding:0;gap:0}:host([mode="mini"]) .progress-wrap--compact .time{display:none}:host([mode="mini"]) .progress-wrap--compact .progress-track{height:12px}:host([mode="mini"]) .progress-wrap--compact .progress-fill,:host([mode="mini"]) .progress-wrap--compact .progress-rail{height:3px;border-radius:0}:host([mode="mini"]) .progress-wrap--compact .progress-thumb{width:10px;height:10px}.progress-wrap--inline{padding:0;min-width:0;width:100%;align-self:center}:host([mode="mini"]) .progress-wrap--inline .progress-track{height:22px}:host([mode="mini"]) .progress-wrap--inline .progress-fill,:host([mode="mini"]) .progress-wrap--inline .progress-rail{height:4px;border-radius:999px}:host([mode="mini"]) .progress-wrap--inline .progress-thumb{width:10px;height:10px}.time{font-size:.6875rem;color:var(--om-text-muted);font-variant-numeric:tabular-nums;min-width:34px}.time:last-child{text-align:right}.progress{position:absolute;top:0;right:0;bottom:0;left:0;z-index:1;width:100%;height:100%;-webkit-appearance:none;-moz-appearance:none;appearance:none;background:transparent;border-radius:999px;cursor:pointer;margin:0;touch-action:none}.progress::-webkit-slider-runnable-track{height:4px;background:var(--om-progress-bg);border-radius:999px}.progress::-webkit-slider-thumb{-webkit-appearance:none;-moz-appearance:none;appearance:none;width:12px;height:12px;border-radius:50%;background:var(--om-progress-fill);border:none;box-shadow:0 0 0 4px transparent;transition:box-shadow .15s;margin-top:-4px}.progress:hover::-webkit-slider-thumb{box-shadow:0 0 0 4px var(--om-accent-soft)}.progress::-moz-range-thumb{width:12px;height:12px;border:none;border-radius:50%;background:var(--om-progress-fill)}.volume-wrap{display:none;align-items:center;gap:6px;color:var(--om-text-muted)}.volume{width:72px;height:4px;-webkit-appearance:none;-moz-appearance:none;appearance:none;background:var(--om-progress-bg);border-radius:999px;accent-color:var(--om-progress-fill)}@media(min-width:960px){.volume-wrap{display:flex}}.player--full{background:var(--om-surface-elevated);border:1px solid var(--om-border);padding:24px}.full-layout{display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:40px;align-items:start}@media(max-width:768px){.full-layout{grid-template-columns:1fr}}.full-now{position:sticky;top:var(--om-header-offset);display:flex;flex-direction:column;gap:20px}.full-cover-wrap{position:relative}.meta--full{margin-top:4px}.meta-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.meta-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}.btn--track-info,.btn--track-info-close{width:36px;height:36px;padding:0;border-radius:999px;color:var(--om-text-secondary)}.btn--track-info:hover,.btn--track-info-close:hover{color:var(--om-text);background:var(--om-surface-hover)}.btn--track-info.is-active{color:var(--om-accent);background:color-mix(in srgb,var(--om-accent) 12%,transparent)}.full-layout--info-open{grid-template-columns:minmax(280px,340px) minmax(0,1fr) minmax(240px,300px)}.track-info-panel{position:sticky;top:var(--om-header-offset);display:flex;flex-direction:column;gap:16px;max-height:min(70vh,640px);padding:18px 18px 20px;border:1px solid var(--om-border);border-radius:16px;background:var(--om-surface);overflow:hidden auto;overscroll-behavior:contain}.track-info-panel__header{display:flex;align-items:center;justify-content:space-between;gap:12px}.track-info-panel__title{margin:0;font-size:.9375rem;font-weight:700;letter-spacing:-.01em}.track-info-panel__state{margin:0;font-size:.875rem;color:var(--om-text-secondary)}.track-info-panel__state--error{color:var(--om-danger, #c0392b)}.track-info-section+.track-info-section{margin-top:4px}.track-info-section__title{margin:0 0 6px;font-size:.6875rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--om-text-muted)}.track-info-section__text{margin:0;font-size:.875rem;line-height:1.6;color:var(--om-text-secondary);white-space:pre-wrap}.track-info-lyrics{margin:0;font:inherit;font-size:.875rem;line-height:1.65;color:var(--om-text-secondary);white-space:pre-wrap}@media(max-width:768px){.full-layout--info-open{grid-template-columns:1fr}.track-info-panel{position:static;max-height:none}}.meta-text{min-width:0;flex:1}.meta--full.meta--idle .title{font-size:1.125rem;font-weight:600;color:var(--om-text-secondary)}.meta--full.meta--idle .artist{margin-top:6px}.full-tracks{min-width:0;display:flex;flex-direction:column;max-height:min(70vh,640px)}.queue--scroll{overflow-y:auto;flex:1;min-height:0;padding-right:6px;overscroll-behavior:contain;scrollbar-gutter:stable}:host([mode="full"]) .queue--scroll{scrollbar-width:thin;scrollbar-color:var(--om-accent) transparent}:host([mode="full"]) .queue--scroll::-webkit-scrollbar{width:8px}:host([mode="full"]) .queue--scroll::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--om-accent) 45%,transparent);border-radius:999px;border:2px solid transparent;background-clip:padding-box}:host([mode="full"]) .queue--scroll::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--om-accent) 65%,transparent);background-clip:padding-box}.queue-title{margin:0 0 12px;font-size:.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--om-text-muted)}.queue{list-style:none;margin:0;padding:0}.queue-item{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;font-size:.9375rem;position:relative;transition:background .18s var(--om-ease),transform .22s var(--om-ease),box-shadow .22s var(--om-ease),opacity .18s var(--om-ease)}.queue-item--draggable{grid-template-columns:24px 28px 1fr auto;gap:6px;padding:8px 10px}.queue--is-dragging .queue-item:not(.is-dragging){transition:transform .22s var(--om-ease),background .18s var(--om-ease),opacity .18s var(--om-ease)}.queue-item.is-dragging{opacity:1;transform:scale(1.025);box-shadow:0 14px 36px #00000061;z-index:4;background:var(--om-surface-elevated)}.queue-item.is-drag-over:before{content:"";position:absolute;left:6px;right:6px;top:-2px;height:3px;border-radius:999px;background:var(--om-accent);box-shadow:0 0 10px color-mix(in srgb,var(--om-accent) 55%,transparent);animation:om-drop-line .2s var(--om-ease)}@keyframes om-drop-line{0%{opacity:0;transform:scaleX(.6)}to{opacity:1;transform:scaleX(1)}}.queue--is-dragging .queue-item:not(.is-dragging){opacity:.72}.queue-drag-handle{width:24px;height:32px;color:var(--om-text-muted);cursor:grab;touch-action:none;flex-shrink:0;opacity:.55;transition:opacity .15s var(--om-ease),color .15s,background .15s}.queue-item:hover .queue-drag-handle,.queue-item.is-dragging .queue-drag-handle{opacity:1}.queue-drag-handle:hover{color:var(--om-accent);background:var(--om-accent-soft);border-radius:8px}.queue-item:hover{background:#4a7c5914}.queue-item.is-active{background:var(--om-accent-soft)}.queue-item.is-active .queue-title-text{color:var(--om-accent);font-weight:600}.queue-index,.queue-title-text{cursor:pointer}.queue-index{font-size:.8125rem;color:var(--om-text-muted);font-variant-numeric:tabular-nums;text-align:center}.queue-title-text{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.queue-duration{font-size:.8125rem;color:var(--om-text-muted);font-variant-numeric:tabular-nums}.queue-empty{padding:24px 12px;color:var(--om-text-muted);font-size:.875rem}.btn-start-album{margin-top:18px;width:100%;border:none;border-radius:999px;padding:14px 20px;background:var(--om-accent);color:#fff;font-family:inherit;font-size:.9375rem;font-weight:600;cursor:pointer;transition:background .15s,transform .15s}.btn-start-album:hover{background:var(--om-accent-hover);transform:translateY(-1px)}.state{padding:8px 0 16px;color:var(--om-text-muted);font-size:.875rem}.state--error,.error-text{color:#c45c5c;font-size:.8125rem;margin:8px 0 0}.player--embed{display:flex;align-items:center;gap:1rem;padding:1rem 1.125rem;background:var(--om-surface-elevated);border:1px solid var(--om-border);border-radius:var(--om-radius-sm);min-height:88px}:host([mode="embed"]) .cover--md{width:72px;height:72px;flex-shrink:0;align-self:center}.embed-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.625rem}.embed-meta-row{display:flex;align-items:center;gap:.75rem;min-width:0}.embed-meta-row .meta{flex:1;min-width:0}.embed-controls{display:flex;align-items:center;gap:.75rem;flex-shrink:0}:host([mode="embed"]) .embed-controls{gap:.75rem}:host([mode="embed"]) .embed-controls .viz{flex-shrink:0;min-width:19px;opacity:.45}:host([mode="embed"]) .embed-controls .viz--active{opacity:1}:host([mode="embed"]) .player--embed{border:none;border-radius:0;background:transparent}:host([mode="embed"]) .btn--play-lg{background:var(--om-accent);color:#fff}.queue-actions{display:flex;align-items:center;gap:4px;position:relative;z-index:1}.btn--heart{flex-shrink:0;touch-action:manipulation}.queue-playing{display:flex;align-items:center;justify-content:center}.queue-playing .viz{transform:scale(.7)}.btn--heart.is-active{color:#e85d75}.btn--heart.is-active:hover{color:#f07088}:host([mode="embed"]) .btn--play-lg:hover{background:var(--om-accent-hover)}.viz{display:flex;align-items:flex-end;gap:2px;height:16px;flex-shrink:0;opacity:.35}.viz--active{opacity:1}.viz__bar{width:3px;height:4px;border-radius:2px;background:var(--om-accent);transition:height .15s ease}.viz--active .viz__bar{animation:om-viz .9s ease-in-out infinite}.viz--active .viz__bar:nth-child(1){animation-delay:0s}.viz--active .viz__bar:nth-child(2){animation-delay:.15s}.viz--active .viz__bar:nth-child(3){animation-delay:.3s}.viz--active .viz__bar:nth-child(4){animation-delay:.1s}.viz--active .viz__bar:nth-child(5){animation-delay:.25s}@keyframes om-viz{0%,to{height:4px}50%{height:14px}}.full-cover-wrap .viz{position:absolute;bottom:12px;left:12px;padding:6px 8px;border-radius:8px;background:#00000073;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.full-cover-wrap .viz .viz__bar{background:#fff}.mini-viz{display:none}@media(min-width:720px){.mini-viz{display:flex}}@media(max-width:640px){.mini-row{grid-template-columns:40px minmax(0,1fr) auto;grid-template-rows:auto auto;gap:4px 8px;padding:8px 10px 10px}.mini-cover-btn{grid-row:1;grid-column:1}.mini-meta-btn{grid-row:1;grid-column:2;min-width:0}.mini-toolbar{grid-row:1;grid-column:3}.mini-viz{display:none!important}:host([mode="mini"]) .progress-wrap--inline{grid-row:2;grid-column:1 / -1;width:100%;padding:4px 0 0;min-width:0}:host([mode="mini"]) .progress-wrap--inline .progress-track{height:18px}:host([mode="mini"]) .progress-wrap--inline .progress-fill,:host([mode="mini"]) .progress-wrap--inline .progress-rail{height:3px}:host([mode="mini"]) .mini-row .cover--sm{width:40px;height:40px}:host([mode="mini"]) .mini-toolbar .btn{width:30px;height:30px}:host([mode="mini"]) .mini-toolbar .btn--play{width:36px;height:36px}:host([mode="mini"]) .mini-toolbar .btn--heart{display:none}:host([mode="mini"]) .mini-options .btn:not(.btn--queue-toggle){display:none}:host([mode="mini"]) .volume-wrap{display:none}}.mini-cover-btn,.mini-meta-btn{border:none;background:none;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;text-align:left;min-width:0;-webkit-tap-highlight-color:transparent}.mini-cover-btn{display:block;border-radius:8px;transition:opacity .15s var(--om-ease)}.mini-cover-btn:active,.mini-meta-btn:active{opacity:.7}.mini-meta-btn{display:flex;align-items:center;min-height:0;align-self:center}:host([queue-expanded]){position:relative;z-index:9999}.queue-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;background:#0000008c;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:1;animation:om-backdrop-in .25s var(--om-ease)}@keyframes om-backdrop-in{0%{opacity:0}to{opacity:1}}.queue-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2;display:flex;flex-direction:column;max-height:92vh;max-height:92dvh;background:#121214;border-radius:20px 20px 0 0;box-shadow:0 -8px 40px #0006;color:#f5f5f2;--sheet-drag: 0px;transform:translateY(var(--sheet-drag));animation:om-sheet-in .32s var(--om-ease);padding-bottom:max(.75rem,env(safe-area-inset-bottom));overflow:hidden;touch-action:none}@keyframes om-sheet-in{0%{transform:translateY(calc(100% + var(--sheet-drag)))}to{transform:translateY(var(--sheet-drag))}}.queue-sheet__handle{flex-shrink:0;display:flex;justify-content:center;padding:10px 0 4px;cursor:grab;touch-action:none}.queue-sheet__handle:active{cursor:grabbing}.queue-sheet__grab{width:36px;height:4px;border-radius:999px;background:#ffffff47}.btn--sheet-close{position:absolute;top:12px;right:12px;width:36px;height:36px;z-index:3;color:#ffffffb3}.btn--sheet-close:hover{color:#fff;background:#ffffff1a}.queue-sheet__now{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:16px;padding:0 24px 20px}.queue-sheet__cover-wrap{position:relative;width:min(220px,55vw)}.queue-sheet__cover-wrap .cover--lg{max-width:none;width:100%;box-shadow:0 24px 60px #00000073}.queue-sheet__cover-wrap .cover-viz{position:absolute;bottom:8px;left:8px;z-index:2;pointer-events:none}.queue-sheet__cover-wrap .cover-viz .viz__bar{background:#fff}.queue-sheet__cover-wrap .cover-heart{position:absolute;top:8px;right:8px;z-index:2}.queue-sheet__cover-wrap .cover-heart .btn--heart{width:36px;height:36px;color:#fff;filter:drop-shadow(0 1px 4px rgba(0,0,0,.45))}.queue-sheet__cover-wrap .cover-heart .btn--heart:hover{color:#fff;background:#ffffff1a;border-radius:50%}.queue-sheet__cover-wrap .cover-heart .btn--heart.is-active{color:#ff8fa3}.meta--sheet{width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}.meta--sheet .title{font-size:1.125rem;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-align:center;width:100%}.meta--sheet .artist{font-size:.875rem;text-align:center;width:100%}:host([mode="mini"]) .queue-sheet .controls .btn{width:40px;height:40px}:host([mode="mini"]) .queue-sheet .btn--play-lg{width:52px;height:52px}:host([mode="mini"]) .queue-sheet .progress-wrap{width:100%;padding:0 4px}.queue-sheet__list{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.08);padding:0 12px}.queue-sheet__list-header{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 48px 6px 8px;flex-shrink:0}.queue-sheet__list .queue-title{margin:0;color:#ffffff80}.queue-count{font-size:.75rem;color:#ffffff61;font-variant-numeric:tabular-nums}:host([mode="mini"]) .queue-sheet .queue--scroll{flex:1;min-height:0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}:host([mode="mini"]) .queue-sheet .queue-item.is-dragging{background:#2c2c30fa;box-shadow:0 16px 40px #0000008c}:host([mode="mini"]) .queue-sheet .queue-item.is-drag-over:before{background:#fff;box-shadow:0 0 12px #ffffff73}:host([mode="mini"]) .queue-sheet .queue-item{grid-template-columns:24px 28px 1fr auto;gap:6px;padding:7px 8px;border-radius:8px;min-height:0}:host([mode="mini"]) .queue-sheet .queue-drag-handle{width:24px;height:32px;color:#ffffff80;opacity:.85}:host([mode="mini"]) .queue-sheet .queue-drag-handle:hover,:host([mode="mini"]) .queue-sheet .queue-item.is-dragging .queue-drag-handle{color:#fffffff2;background:#ffffff1a}.queue-drag-handle:active{cursor:grabbing}.queue-drag-handle .icon{width:14px;height:14px}:host([mode="mini"]) .queue-sheet .queue-item:hover{background:#ffffff0f}:host([mode="mini"]) .queue-sheet .queue-item.is-active{background:#ffffff1a}:host([mode="mini"]) .queue-sheet .queue-item.is-active .queue-title-text{color:#fff}:host([mode="mini"]) .queue-sheet .queue-index,:host([mode="mini"]) .queue-sheet .queue-duration{color:#ffffff73}:host([mode="mini"]) .queue-sheet .queue-title-text{color:#ffffffe6}:host([mode="mini"]) .queue-sheet .queue-empty{color:#fff6}:host([mode="mini"]) .queue-sheet .btn--queue-remove{width:32px;height:32px;color:#fff6}:host([mode="mini"]) .queue-sheet .btn--queue-remove:hover{color:#e85d75;background:#e85d751f}.btn--queue-add{width:28px;height:28px;color:var(--om-accent)}.btn--queue-add:hover{background:var(--om-accent-soft)}.btn--queue-toggle.is-active{color:#fff;background:#ffffff24}.queue-sheet__body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}.queue-toast{position:absolute;top:52px;left:50%;transform:translate(-50%);z-index:5;padding:8px 16px;border-radius:999px;background:#ffffff24;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;font-size:.8125rem;font-weight:500;white-space:nowrap;pointer-events:none;animation:om-toast-in .2s var(--om-ease)}@keyframes om-toast-in{0%{opacity:0;transform:translate(-50%) translateY(-6px)}to{opacity:1;transform:translate(-50%) translateY(0)}}.queue-title-btn{border:none;background:none;padding:0;margin:0;font:inherit;color:inherit;cursor:pointer;text-align:left;min-width:0;-webkit-tap-highlight-color:transparent}.queue--album .queue-item{grid-template-columns:32px minmax(0,1fr) auto}.queue--album .queue-actions{gap:2px}.btn--queue-add,.btn--queue-next{width:32px;height:32px;flex-shrink:0;color:var(--om-text-muted);opacity:0;transition:opacity .15s var(--om-ease),color .15s,background .15s}.queue-item:hover .btn--queue-add,.queue-item:hover .btn--queue-next,.queue-item:focus-within .btn--queue-add,.queue-item:focus-within .btn--queue-next{opacity:1}.btn--queue-add:hover:not(:disabled){color:var(--om-accent);background:var(--om-accent-soft)}.btn--queue-add.is-added{opacity:1;color:var(--om-accent)}.btn--queue-add.is-added:hover{color:#e85d75;background:#e85d751a}.btn--queue-add:disabled{cursor:default;opacity:1}.btn--queue-next:hover{color:var(--om-accent);background:var(--om-accent-soft)}@media(max-width:768px){.queue--album .btn--queue-add,.queue--album .btn--queue-next{opacity:1}}@media(min-width:769px){.queue-backdrop{background:#0000007a}.queue-sheet{left:50%;right:auto;top:50%;bottom:auto;width:min(920px,calc(100vw - 48px));max-height:min(640px,calc(100vh - 48px));border-radius:20px;--sheet-drag: 0px;transform:translate(-50%,calc(-50% + var(--sheet-drag)));animation:om-sheet-desktop-in .28s var(--om-ease);padding-bottom:0;touch-action:auto}@keyframes om-sheet-desktop-in{0%{opacity:0;transform:translate(-50%,calc(-50% + var(--sheet-drag) + 24px))}to{opacity:1;transform:translate(-50%,calc(-50% + var(--sheet-drag)))}}@keyframes om-sheet-in{0%{transform:translateY(calc(100% + var(--sheet-drag)))}to{transform:translateY(var(--sheet-drag))}}.queue-sheet__handle{display:none}.btn--sheet-close{top:14px;right:14px}.queue-sheet__body{flex-direction:row;gap:0;padding:28px 24px 24px}.queue-sheet__now{flex:0 0 min(320px,38%);padding:0 20px 0 0;border-right:1px solid rgba(255,255,255,.08);justify-content:flex-start}.queue-sheet__cover-wrap{width:min(240px,100%);margin:0 auto}.queue-sheet__list{flex:1;min-width:0;border-top:none;padding:0 0 0 24px}.queue-sheet__list-header{padding-top:0;padding-right:40px}}';
function Q(a) {
  const e = Math.floor(a / 1e3);
  return `${Math.floor(e / 60)}:${String(e % 60).padStart(2, "0")}`;
}
function St(a) {
  const e = a % 10, t = a % 100;
  return e === 1 && t !== 11 ? `${a} трек` : e >= 2 && e <= 4 && (t < 12 || t > 14) ? `${a} трека` : `${a} треков`;
}
function At() {
  return document.getElementById("om-global");
}
class se extends C {
  constructor() {
    super();
    u(this, "store", $t());
    u(this, "favorites", bt());
    u(this, "client", null);
    u(this, "unsub", null);
    u(this, "unsubFav", null);
    u(this, "restoreInFlight", null);
    u(this, "playGestureHandled", !1);
    u(this, "progressTimer", null);
    u(this, "heartClickHandler", null);
    u(this, "escapeHandler", null);
    u(this, "sheetDragStartY", 0);
    u(this, "sheetDragOffset", 0);
    u(this, "sheetDragging", !1);
    u(this, "queueDragPointerId", null);
    u(this, "queueDragCleanup", null);
    u(this, "onCmdNext", () => {
      this.store.next();
    });
    u(this, "onCmdPrev", () => {
      this.store.prev();
    });
    u(this, "onPlayPointerDown", (t) => {
      t.button === 0 && (this.store.engine.unlockUserGesture(), this.mode === "embed" && this.isEmbedPlaying() && (this.playGestureHandled = this.trySyncPlayPause(), this.playGestureHandled && t.preventDefault()));
    });
    u(this, "onPlayClick", (t) => {
      if (this.mode === "embed") {
        if (this.isEmbedPlaying()) {
          t.preventDefault(), this.store.toggleFromUserGesture();
          return;
        }
        this.track ? this.playSlug(this.track) : this.album && this.playAlbum(this.album);
        return;
      }
      if (this.mode === "full" && !this.current && this.album) {
        this.loadQueue(!0);
        return;
      }
      if (this.playGestureHandled) {
        this.playGestureHandled = !1, t.preventDefault();
        return;
      }
      if (t.preventDefault(), this.loading) {
        this.mediaPlayPausePublic();
        return;
      }
      this.mediaPlayPausePublic();
    });
    this.mode = "mini", this.apiBase = "/api/v1", this.theme = "light", this.track = "", this.album = "", this.playlist = "", this.albumCover = "", this.albumTitle = "", this.albumArtist = "", this.autoPlay = !1, this.loading = !1, this.error = "", this.visible = !1, this.seeking = !1, this.scrubMs = 0, this.previewTrack = null, this.queueExpanded = !1, this.pageTracks = [], this.queueNotice = "", this.queueDragFrom = null, this.queueDragOver = null, this.trackInfoOpen = !1, this.trackInfoLoading = !1, this.trackInfoDetail = null, this.trackInfoError = "", this.trackInfoSlug = null;
  }
  connectedCallback() {
    if (super.connectedCallback(), this.client = new Je(this.apiBase), this.unsub = this.store.subscribe(() => {
      var t;
      if (this.isConnected) {
        if (this.mode === "mini" && (this.store.getCurrentTrack() || this.hasLiveAudio()) && (this.visible = !0), this.mode === "full" && this.trackInfoOpen) {
          const i = (t = this.current) == null ? void 0 : t.slug;
          i && i !== this.trackInfoSlug && this.loadTrackInfo(i);
        }
        this.seeking || this.scheduleUiUpdate();
      }
    }), this.unsubFav = this.favorites.subscribe(() => {
      this.scheduleUiUpdate();
    }), this.store.engine.onLoadError((t) => {
      this.isConnected && (this.error = t, this.loading = !1, this.scheduleUiUpdate());
    }), this.mode === "mini")
      if (this.store.setRestoreHandler(() => this.restoreSessionPublic()), this.store.hasActiveSession() || this.hasHealthySession())
        this.visible = !0;
      else {
        const t = this.store.loadSaved();
        t != null && t.trackSlug && queueMicrotask(() => {
          !this.isConnected || this.store.hasActiveSession() || this.hasHealthySession() || this.restoreSessionPublic();
        });
      }
    this.store.getCurrentTrack() && (this.visible = !0), this.addEventListener("om:cmd-next", this.onCmdNext), this.addEventListener("om:cmd-prev", this.onCmdPrev), this.mode === "full" ? this.loadPageTracksFromPage() : this.mode === "embed" && this.track && (this.autoPlay ? this.playSlug(this.track) : this.scheduleEmbedPreload()), (this.mode === "mini" || this.mode === "full" || this.mode === "embed") && this.startProgressTimer(), this.heartClickHandler = (t) => {
      const i = t.target.closest(".btn--heart");
      if (!i || !this.renderRoot.contains(i)) return;
      t.preventDefault(), t.stopPropagation();
      const s = i.getAttribute("data-slug");
      s && (this.favorites.toggle(s), this.requestUpdate());
    }, this.renderRoot.addEventListener("click", this.heartClickHandler), this.escapeHandler = (t) => {
      if (t.key === "Escape") {
        if (this.trackInfoOpen) {
          this.closeTrackInfo();
          return;
        }
        this.queueExpanded && this.closeQueueExpanded();
      }
    }, document.addEventListener("keydown", this.escapeHandler);
  }
  disconnectedCallback() {
    var t, i;
    this.stopProgressTimer(), this.removeEventListener("om:cmd-next", this.onCmdNext), this.removeEventListener("om:cmd-prev", this.onCmdPrev), this.heartClickHandler && (this.renderRoot.removeEventListener("click", this.heartClickHandler), this.heartClickHandler = null), this.escapeHandler && (document.removeEventListener("keydown", this.escapeHandler), this.escapeHandler = null), this.clearQueueDrag(), this.setBodyScrollLock(!1), (t = this.unsub) == null || t.call(this), (i = this.unsubFav) == null || i.call(this), this.unsub = null, this.unsubFav = null, super.disconnectedCallback();
  }
  requestUpdate(t, i) {
    this.isConnected && super.requestUpdate(t, i);
  }
  performUpdate() {
    this.isConnected && super.performUpdate();
  }
  updated(t) {
    this.isConnected && (t.has("theme") && this.setAttribute("theme", this.theme), this.mode === "embed" && t.has("track") && this.track && !this.autoPlay && this.scheduleEmbedPreload());
  }
  /** Load embed metadata after first paint — keeps navigation snappy. */
  scheduleEmbedPreload() {
    const t = () => {
      this.isConnected && this.preloadEmbedTrack();
    };
    typeof requestIdleCallback == "function" ? requestIdleCallback(t, { timeout: 2e3 }) : setTimeout(t, 120);
  }
  /** Defer Lit update so Turbo teardown can finish first. */
  scheduleUiUpdate() {
    queueMicrotask(() => {
      !this.isConnected || this.seeking || this.requestUpdate();
    });
  }
  startProgressTimer() {
    this.stopProgressTimer(), this.progressTimer = window.setInterval(() => {
      if (!this.isConnected || this.seeking || !(this.mode === "embed" ? !!(this.hasLiveAudio() || this.embedSource) : !!this.store.getCurrentTrack())) return;
      const i = this.resolveScrubDurationMs();
      i > 0 && (this.seeking ? this.syncProgressDom(this.scrubMs, i) : this.scheduleUiUpdate());
    }, 250);
  }
  hasLiveAudio() {
    const t = this.store.engine.peekAudioElement();
    return !!(t != null && t.src && !t.ended);
  }
  stopProgressTimer() {
    this.progressTimer !== null && (clearInterval(this.progressTimer), this.progressTimer = null);
  }
  playQueueIndex(t) {
    this.playQueueIndexAsync(t);
  }
  queueNeedsStreams(t) {
    return t.some((i) => {
      var s;
      return !((s = i.stream) != null && s.url);
    });
  }
  mergeQueueStreams(t, i) {
    const s = new Map(t.map((r) => [r.slug, r]));
    return i.map((r) => s.get(r.slug) ?? r);
  }
  async resolveQueueStreams(t) {
    if (!this.client || !this.queueNeedsStreams(t))
      return t.map((i) => f(this.apiBase, i));
    if (this.album) {
      const { data: i } = await this.client.getAlbumTracks(this.album);
      return this.mergeQueueStreams(i, t).map((s) => f(this.apiBase, s));
    }
    return Promise.all(
      t.map(async (i) => {
        var s;
        return (s = i.stream) != null && s.url ? f(this.apiBase, i) : f(this.apiBase, await this.client.getTrack(i.slug));
      })
    );
  }
  async playQueueIndexAsync(t) {
    var i, s;
    if (this.client)
      try {
        const r = await this.resolveQueueStreams(this.queue);
        this.store.originalQueue = this.mergeQueueStreams(r, this.store.originalQueue), this.store.queue = [...r];
        const n = ((i = r[t]) == null ? void 0 : i.slug) === ((s = this.store.getCurrentTrack()) == null ? void 0 : s.slug) ? this.store.getPositionMs() : 0;
        this.store.setQueue(r, t, n);
      } catch {
        this.isConnected && (this.error = "Трек недоступен");
      }
  }
  get embedSource() {
    var t;
    return this.mode !== "embed" ? this.current : this.hasLiveAudio() && this.current ? this.current : ((t = this.previewTrack) == null ? void 0 : t.slug) === this.track ? this.previewTrack : this.previewTrack;
  }
  async preloadEmbedTrack() {
    var t, i, s;
    if (!(!this.client || !this.track || this.mode !== "embed") && !(((t = this.current) == null ? void 0 : t.slug) === this.track || ((i = this.previewTrack) == null ? void 0 : i.slug) === this.track)) {
      this.loading = !0, this.error = "";
      try {
        const r = f(this.apiBase, await this.client.getTrack(this.track));
        if (!((s = r.stream) != null && s.url)) {
          if (!this.isConnected) return;
          this.previewTrack = null, this.error = "Аудиофайл недоступен на сервере";
          return;
        }
        this.previewTrack = r, this.albumCover = r.coverThumbUrl ?? r.coverUrl ?? "", this.requestUpdate();
      } catch {
        if (!this.isConnected) return;
        this.previewTrack = null, this.error = "Трек недоступен";
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  get current() {
    return this.store.getCurrentTrack();
  }
  get playing() {
    return this.store.isPlaying();
  }
  get positionMs() {
    return this.store.getPositionMs();
  }
  get queue() {
    return this.store.queue;
  }
  get displayTitle() {
    const t = this.mode === "embed" ? this.embedSource : this.current;
    return (t == null ? void 0 : t.title) ?? this.albumTitle ?? "Выберите трек";
  }
  get displayArtist() {
    const t = this.mode === "embed" ? this.embedSource : this.current;
    return (t == null ? void 0 : t.artistName) ?? this.albumArtist ?? "";
  }
  get coverUrl() {
    const t = this.mode === "embed" ? this.embedSource : this.current;
    return (t == null ? void 0 : t.coverThumbUrl) ?? (t == null ? void 0 : t.coverUrl) ?? this.albumCover ?? "";
  }
  renderPlayButton(t = "md", i = this.playing) {
    return h`
      <button
        class=${t === "lg" ? "btn btn--play btn--play-lg" : "btn btn--play"}
        @pointerdown=${this.onPlayPointerDown}
        @click=${this.onPlayClick}
        aria-label=${i ? "Пауза" : "Воспроизвести"}
        aria-busy=${this.loading ? "true" : "false"}
      >
        ${this.loading ? rt : i ? et : Xe}
      </button>
    `;
  }
  renderHeart(t) {
    if (!t) return c;
    const i = this.favorites.isFavorite(t);
    return h`
      <button
        type="button"
        class="btn btn--heart${i ? " is-active" : ""}"
        data-slug=${t}
        aria-label=${i ? "Убрать из избранного" : "В избранное"}
        aria-pressed=${i ? "true" : "false"}
      >
        ${i ? ot : nt}
      </button>
    `;
  }
  get displayPositionMs() {
    return this.seeking ? this.scrubMs : this.positionMs;
  }
  resolveScrubDurationMs() {
    var i, s;
    const t = this.store.getDurationMs();
    return t > 0 ? t : (i = this.current) != null && i.durationMs ? this.current.durationMs : this.mode === "embed" ? ((s = this.embedSource) == null ? void 0 : s.durationMs) ?? 0 : 0;
  }
  canScrub() {
    return this.mode === "embed" ? this.hasLiveAudio() && this.resolveScrubDurationMs() > 0 : !!this.store.getCurrentTrack() && this.resolveScrubDurationMs() > 0;
  }
  renderProgress(t, i = !1, s = !1) {
    const r = this.resolveScrubDurationMs() || t || 1, n = this.displayPositionMs, l = Math.min(100, Math.max(0, n / r * 100)), o = !this.canScrub();
    return h`
      <div class="progress-wrap${i ? " progress-wrap--compact" : ""}${s ? " progress-wrap--inline" : ""}${this.seeking ? " is-scrubbing" : ""}${o ? " progress-wrap--readonly" : ""}">
        ${s ? c : h`<span class="time">${Q(n)}</span>`}
        <div
          class="progress-track"
          role="slider"
          tabindex=${o ? -1 : 0}
          aria-label="Прогресс"
          aria-valuemin="0"
          aria-valuemax=${r}
          aria-valuenow=${Math.round(n)}
          aria-disabled=${o ? "true" : "false"}
          @pointerdown=${this.onProgressPointerDown}
        >
          <div class="progress-rail" aria-hidden="true"></div>
          <div class="progress-fill" style=${`width:${l}%`}></div>
          <div class="progress-thumb" style=${`left:${l}%`} aria-hidden="true"></div>
        </div>
        ${s ? c : h`<span class="time">${Q(r)}</span>`}
      </div>
    `;
  }
  seekFromPointer(t, i) {
    const s = this.renderRoot.querySelector(".progress-track");
    if (!s) return this.scrubMs;
    const r = s.getBoundingClientRect();
    if (r.width <= 0) return 0;
    const n = Math.max(0, Math.min(1, (t.clientX - r.left) / r.width));
    return Math.floor(n * i);
  }
  syncProgressDom(t, i) {
    const s = Math.min(100, Math.max(0, i > 0 ? t / i * 100 : 0)), r = this.renderRoot.querySelector(".progress-track");
    if (!r) return;
    const n = r.querySelector(".progress-fill"), l = r.querySelector(".progress-thumb");
    n && (n.style.width = `${s}%`), l && (l.style.left = `${s}%`);
  }
  onProgressPointerDown(t) {
    if (!this.canScrub()) return;
    const i = this.resolveScrubDurationMs();
    if (i <= 0) return;
    const s = t.currentTarget;
    t.preventDefault(), s.setPointerCapture(t.pointerId), this.seeking = !0, this.scrubMs = this.seekFromPointer(t, i), this.syncProgressDom(this.scrubMs, i), this.requestUpdate();
    const r = (l) => {
      this.seeking && (this.scrubMs = this.seekFromPointer(l, i), this.syncProgressDom(this.scrubMs, i), this.requestUpdate());
    }, n = (l) => {
      window.removeEventListener("pointermove", r), window.removeEventListener("pointerup", n), window.removeEventListener("pointercancel", n), s.hasPointerCapture(l.pointerId) && s.releasePointerCapture(l.pointerId), this.seeking && (this.seeking = !1, this.store.seek(this.scrubMs), this.scrubMs = this.store.getPositionMs(), this.scheduleUiUpdate());
    };
    window.addEventListener("pointermove", r), window.addEventListener("pointerup", n), window.addEventListener("pointercancel", n);
  }
  renderCover(t = "sm") {
    const i = this.coverUrl, s = `cover cover--${t}`;
    return i ? h`<img class=${s} src=${i} alt=${this.displayTitle} loading="lazy">` : h`<div class=${s}></div>`;
  }
  loadPageTracksFromPage() {
    const t = this.getAttribute("data-queue-source");
    if (!t) return !1;
    const i = document.getElementById(t);
    if (!(i != null && i.textContent)) return !1;
    try {
      const s = JSON.parse(i.textContent);
      return !Array.isArray(s) || s.length === 0 ? !1 : (this.pageTracks = s, !0);
    } catch {
      return !1;
    }
  }
  async playPageTrack(t) {
    if (this.client && !(this.pageTracks.length === 0 && !this.loadPageTracksFromPage())) {
      this.store.engine.unlockUserGesture(), this.loading = !0, this.error = "";
      try {
        const i = await this.resolveQueueStreams(this.pageTracks);
        this.pageTracks = i, this.store.setQueue(i, t, 0, !0, !0), this.visible = !0;
      } catch {
        this.isConnected && (this.error = "Трек недоступен");
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  showQueueNotice(t) {
    this.queueNotice = t, this.requestUpdate(), window.setTimeout(() => {
      this.queueNotice === t && (this.queueNotice = "", this.requestUpdate());
    }, 2200);
  }
  hydrateQueueFromPage() {
    const t = this.getAttribute("data-queue-source");
    if (!t) return !1;
    const i = document.getElementById(t);
    if (!(i != null && i.textContent)) return !1;
    try {
      const s = JSON.parse(i.textContent);
      if (!Array.isArray(s) || s.length === 0) return !1;
      this.store.originalQueue = s, this.store.queue = [...s];
      const r = this.store.getCurrentTrack();
      if (r) {
        const n = s.findIndex((l) => l.slug === r.slug);
        n >= 0 && (this.store.queueIndex = n);
      }
      return !0;
    } catch {
      return !1;
    }
  }
  async loadQueue(t) {
    var s;
    if (!this.client) return;
    if (this.pageTracks.length === 0 && this.loadPageTracksFromPage(), this.pageTracks.length > 0) {
      t && await this.playPageTrack(0);
      return;
    }
    if (this.hydrateQueueFromPage()) {
      if (t && this.store.queue.length) {
        this.loading = !0, this.error = "";
        try {
          const r = await this.resolveQueueStreams(this.store.originalQueue);
          this.store.originalQueue = r, this.store.queue = [...r], this.store.setQueue(r, 0, 0, !0, !0), this.visible = !0;
        } catch {
          this.error = "Не удалось загрузить треки";
        } finally {
          this.isConnected && (this.loading = !1);
        }
      }
      return;
    }
    const i = (s = this.store.originalQueue[0]) == null ? void 0 : s.albumSlug;
    if (this.album && i === this.album && this.store.originalQueue.length > 0) {
      this.store.queue = [...this.store.originalQueue], t && this.store.queue.length && (this.store.setQueue(this.store.originalQueue, 0, 0, !0, !0), this.visible = !0);
      return;
    }
    this.loading = !0, this.error = "";
    try {
      let r = [];
      this.album ? r = (await this.client.getAlbumTracks(this.album)).data.map(
        (n) => f(this.apiBase, n)
      ) : this.playlist && (r = (await this.client.getPlaylistTracks(this.playlist)).tracks), this.store.originalQueue = r, this.store.queue = [...r], t && r.length && (this.store.setQueue(r, 0, 0, !0, !0), this.visible = !0);
    } catch {
      this.error = "Не удалось загрузить треки";
    } finally {
      this.isConnected && (this.loading = !1);
    }
  }
  async playSlug(t, i = 0) {
    var s, r;
    if (this.client) {
      this.loading = !0, this.error = "";
      try {
        const n = f(this.apiBase, await this.client.getTrack(t));
        if (!((s = n.stream) != null && s.url)) {
          this.isConnected && (this.error = "Аудиофайл недоступен на сервере");
          return;
        }
        const l = this.mode === "embed" || !!((r = this.store.engine.peekAudioElement()) != null && r.error);
        this.mode === "embed" && (this.previewTrack = n), this.store.playTrack(n, i, l || this.mode === "embed"), this.visible = !0, this.dispatchEvent(new CustomEvent("om:play", { bubbles: !0, composed: !0, detail: { track: n } }));
      } catch {
        this.isConnected && (this.error = "Трек недоступен");
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  async playAlbum(t) {
    if (this.client) {
      this.loading = !0;
      try {
        const { data: i } = await this.client.getAlbumTracks(t);
        if (i.length) {
          const s = i.map((r) => f(this.apiBase, r));
          this.store.setQueue(s, 0, 0, !0, !0), this.visible = !0;
        }
      } catch {
        this.error = "Альбом недоступен";
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  async playPlaylist(t) {
    if (this.client) {
      this.loading = !0;
      try {
        const { tracks: i } = await this.client.getPlaylistTracks(t);
        i.length && (this.store.setQueue(i, 0, 0, !0, !0), this.visible = !0);
      } catch {
        this.error = "Плейлист недоступен";
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  /** Play/pause synchronously while the user-gesture is still active. */
  trySyncPlayPausePublic() {
    return this.trySyncPlayPause();
  }
  audioReadyForToggle() {
    if (this.store.engine.hasPlayableSource()) return !0;
    const t = this.store.engine.peekAudioElement();
    return !!(t != null && t.src && !t.error && !t.ended && t.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
  }
  trySyncPlayPause() {
    return this.store.isPlaying() ? (this.store.toggleFromUserGesture(), !0) : this.store.getCurrentTrack() && this.audioReadyForToggle() ? (this.store.toggleFromUserGesture(), !0) : !1;
  }
  isEmbedPlaying() {
    var s, r;
    if (!this.track) return !1;
    const t = this.store.engine.peekAudioElement();
    return !(t != null && t.src) || t.paused || t.ended ? !1 : (((s = this.current) == null ? void 0 : s.slug) ?? ((r = this.store.queue[this.store.queueIndex]) == null ? void 0 : r.slug)) === this.track;
  }
  repeatIcon(t) {
    return t === "one" ? it : tt;
  }
  repeatAriaLabel() {
    return this.store.repeat === "one" ? "Повтор одного трека" : this.store.repeat === "all" ? "Повтор всего" : "Повтор выключен";
  }
  renderMiniOptions() {
    return h`
      <div class="mini-options">
        <button
          class="btn${this.store.shuffle ? " is-active" : ""}"
          @click=${() => this.store.toggleShuffle()}
          aria-label="Случайный порядок"
          title="Случайный порядок"
        >${W}</button>
        <button
          class="btn${this.store.repeat !== "off" ? " is-active" : ""}"
          @click=${() => this.store.cycleRepeat()}
          aria-label=${this.repeatAriaLabel()}
          title=${this.repeatAriaLabel()}
        >${this.repeatIcon(this.store.repeat)}</button>
        <button
          class="btn btn--queue-toggle${this.queueExpanded ? " is-active" : ""}"
          @click=${() => this.toggleQueueExpanded()}
          aria-label=${this.queueExpanded ? "Свернуть очередь" : "Развернуть очередь"}
          aria-expanded=${this.queueExpanded ? "true" : "false"}
          title="Очередь"
        >${lt}</button>
      </div>
    `;
  }
  toggleQueueExpanded() {
    this.queueExpanded = !this.queueExpanded, this.setBodyScrollLock(this.queueExpanded), this.queueExpanded ? this.setAttribute("queue-expanded", "") : this.removeAttribute("queue-expanded"), this.requestUpdate();
  }
  closeQueueExpanded() {
    this.queueExpanded && (this.clearQueueDrag(), this.queueExpanded = !1, this.setBodyScrollLock(!1), this.removeAttribute("queue-expanded"), this.requestUpdate());
  }
  setBodyScrollLock(t) {
    this.mode === "mini" && (document.body.style.overflow = t ? "hidden" : "");
  }
  onSheetPointerDown(t) {
    t.button === 0 && (this.sheetDragging = !0, this.sheetDragStartY = t.clientY, this.sheetDragOffset = 0, t.currentTarget.setPointerCapture(t.pointerId));
  }
  onSheetPointerMove(t) {
    if (!this.sheetDragging) return;
    const i = t.clientY - this.sheetDragStartY;
    this.sheetDragOffset = Math.max(0, i);
    const s = this.renderRoot.querySelector(".queue-sheet");
    s && s.style.setProperty("--sheet-drag", `${this.sheetDragOffset}px`);
  }
  onSheetPointerUp(t) {
    if (!this.sheetDragging) return;
    this.sheetDragging = !1;
    const i = this.renderRoot.querySelector(".queue-sheet");
    i && i.style.removeProperty("--sheet-drag"), this.sheetDragOffset > 80 && this.closeQueueExpanded(), this.sheetDragOffset = 0, t.currentTarget.hasPointerCapture(t.pointerId) && t.currentTarget.releasePointerCapture(t.pointerId);
  }
  closeTrackInfo() {
    this.trackInfoOpen = !1, this.trackInfoDetail = null, this.trackInfoSlug = null, this.trackInfoError = "", this.trackInfoLoading = !1, this.requestUpdate();
  }
  toggleTrackInfo(t) {
    if (this.trackInfoOpen && this.trackInfoSlug === t) {
      this.closeTrackInfo();
      return;
    }
    this.trackInfoOpen = !0, this.loadTrackInfo(t);
  }
  async loadTrackInfo(t) {
    if (this.client) {
      this.trackInfoSlug = t, this.trackInfoLoading = !0, this.trackInfoError = "", this.requestUpdate();
      try {
        const i = f(this.apiBase, await this.client.getTrack(t));
        if (this.trackInfoSlug !== t) return;
        this.trackInfoDetail = i;
      } catch {
        this.trackInfoSlug === t && (this.trackInfoDetail = null, this.trackInfoError = "Не удалось загрузить информацию о треке");
      } finally {
        this.trackInfoSlug === t && (this.trackInfoLoading = !1, this.requestUpdate());
      }
    }
  }
  renderTrackInfoButton(t) {
    const i = this.trackInfoOpen && this.trackInfoSlug === t;
    return h`
      <button
        type="button"
        class="btn btn--track-info${i ? " is-active" : ""}"
        @click=${(s) => {
      s.stopPropagation(), this.toggleTrackInfo(t);
    }}
        aria-label="О треке"
        title="О треке"
        aria-pressed=${i ? "true" : "false"}
      >${mt}</button>
    `;
  }
  renderTrackInfoSections(t) {
    var n, l, o;
    const i = ((n = t.credits) == null ? void 0 : n.trim()) ?? "", s = ((l = t.description) == null ? void 0 : l.trim()) ?? "", r = ((o = t.lyrics) == null ? void 0 : o.trim()) ?? "";
    return !i && !s && !r ? h`<p class="track-info-panel__state">Нет дополнительной информации</p>` : h`
      ${i ? h`<section class="track-info-section"><h4 class="track-info-section__title">Участники</h4><p class="track-info-section__text">${i}</p></section>` : c}
      ${s ? h`<section class="track-info-section"><h4 class="track-info-section__title">Описание</h4><p class="track-info-section__text">${s}</p></section>` : c}
      ${r ? h`<section class="track-info-section"><h4 class="track-info-section__title">Текст</h4><pre class="track-info-lyrics">${r}</pre></section>` : c}
    `;
  }
  renderTrackInfoPanel() {
    if (!this.trackInfoOpen) return c;
    const t = this.trackInfoDetail;
    return h`
      <aside class="track-info-panel" role="complementary" aria-label="О треке">
        <div class="track-info-panel__header">
          <h3 class="track-info-panel__title">О треке</h3>
          <button type="button" class="btn btn--track-info-close" @click=${() => this.closeTrackInfo()} aria-label="Закрыть">${ht}</button>
        </div>
        ${this.trackInfoLoading ? h`<p class="track-info-panel__state">Загрузка…</p>` : c}
        ${this.trackInfoError ? h`<p class="track-info-panel__state track-info-panel__state--error">${this.trackInfoError}</p>` : c}
        ${!this.trackInfoLoading && t ? this.renderTrackInfoSections(t) : c}
      </aside>
    `;
  }
  renderAlbumTrackList() {
    const t = this.pageTracks;
    return h`
      <ol class="queue queue--scroll queue--album" role="list">
        ${t.length === 0 && !this.loading ? h`<li class="queue-empty">Треков пока нет</li>` : t.map((i, s) => {
      var l;
      const r = i.slug === ((l = this.current) == null ? void 0 : l.slug), n = this.store.hasInQueue(i.slug);
      return h`
                <li role="listitem" class="queue-item${r ? " is-active" : ""}">
                  <span class="queue-index" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.playPageTrack(s)}>
                    ${r && this.playing ? h`<span class="queue-playing">${q(!0)}</span>` : i.trackNumber ?? s + 1}
                  </span>
                  <button type="button" class="queue-title-btn" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.playPageTrack(s)}>
                    <span class="queue-title-text">${i.title}</span>
                  </button>
                  <span class="queue-actions">
                    <button
                      type="button"
                      class="btn btn--queue-add${n ? " is-added" : ""}"
                      @click=${(o) => {
        o.stopPropagation(), n ? this.removeTrackFromQueue(i.slug) : this.addTrackToQueue(i, !1);
      }}
                      aria-label=${n ? "Убрать из очереди" : "Добавить в очередь"}
                      title=${n ? "Убрать из очереди" : "В очередь"}
                    >${n ? dt : ut}</button>
                    <button
                      type="button"
                      class="btn btn--queue-next"
                      @click=${(o) => {
        o.stopPropagation(), this.addTrackToQueue(i, !0);
      }}
                      aria-label="Играть следующим"
                      title="Следующим"
                    >${pt}</button>
                    ${r ? this.renderTrackInfoButton(i.slug) : c}
                    ${this.renderHeart(i.slug)}
                    <span class="queue-duration">${Q(i.durationMs)}</span>
                  </span>
                </li>
              `;
    })}
      </ol>
    `;
  }
  async addTrackToQueue(t, i) {
    var s, r, n;
    if (this.client)
      try {
        const l = (s = t.stream) != null && s.url ? f(this.apiBase, t) : f(this.apiBase, await this.client.getTrack(t.slug)), o = this.store.hasInQueue(t.slug);
        (i ? this.store.playNext(l) : this.store.addToQueue(l)) && (this.visible = !0, i ? this.showQueueNotice(o ? "Перемещено вверх" : "Будет следующим") : this.showQueueNotice("Добавлено в очередь"), (n = (r = At()) == null ? void 0 : r.showPublic) == null || n.call(r));
      } catch {
        this.showQueueNotice("Не удалось добавить");
      }
  }
  removeTrackFromQueue(t) {
    this.store.removeBySlug(t) && (this.showQueueNotice("Убрано из очереди"), this.requestUpdate());
  }
  clearQueueDrag() {
    var t;
    (t = this.queueDragCleanup) == null || t.call(this), this.queueDragCleanup = null, this.queueDragPointerId = null, this.queueDragFrom = null, this.queueDragOver = null;
  }
  getQueueDragPreview() {
    const t = this.queue.map((o, d) => d), i = this.queueDragFrom, s = this.queueDragOver;
    if (i === null || s === null || i === s) return t;
    const r = [...t], [n] = r.splice(i, 1), l = Math.max(0, Math.min(s, r.length));
    return r.splice(l, 0, n), r;
  }
  getQueueListIndices(t = !1) {
    const i = this.queueDragFrom !== null ? this.getQueueDragPreview() : this.queue.map((s, r) => r);
    return t ? i.filter((s) => s >= this.store.queueIndex) : i;
  }
  resolveQueueDragIndex(t) {
    const i = this.renderRoot.querySelectorAll("[data-queue-index]");
    for (const s of i) {
      const r = s.getBoundingClientRect(), n = r.top + r.height / 2;
      if (t < n)
        return Number(s.dataset.queueIndex);
    }
    return i.length > 0 ? i.length : null;
  }
  onQueueDragStart(t, i) {
    if (t.button !== 0) return;
    t.preventDefault(), t.stopPropagation(), this.clearQueueDrag(), this.queueDragFrom = i, this.queueDragOver = i, this.queueDragPointerId = t.pointerId, t.currentTarget.setPointerCapture(t.pointerId);
    const s = (n) => {
      if (n.pointerId !== this.queueDragPointerId) return;
      const l = this.resolveQueueDragIndex(n.clientY);
      if (l === null) return;
      const o = l !== this.queueDragOver;
      this.queueDragOver = l, o && typeof navigator.vibrate == "function" && navigator.vibrate(10), this.requestUpdate();
    }, r = (n) => {
      if (n.pointerId !== this.queueDragPointerId) return;
      const l = this.queueDragFrom, o = this.queueDragOver;
      this.clearQueueDrag(), l !== null && o !== null && l !== o && this.store.moveQueueItem(l, o), this.requestUpdate();
    };
    window.addEventListener("pointermove", s), window.addEventListener("pointerup", r), window.addEventListener("pointercancel", r), this.queueDragCleanup = () => {
      window.removeEventListener("pointermove", s), window.removeEventListener("pointerup", r), window.removeEventListener("pointercancel", r);
    };
  }
  renderQueueList(t = {}) {
    const { removable: i = !1, draggable: s = !1, upcomingOnly: r = !1 } = t, n = this.getQueueListIndices(r), l = this.queueDragFrom !== null;
    return h`
      <ol class="queue queue--scroll${l ? " queue--is-dragging" : ""}" role="list">
        ${n.length === 0 && !this.loading ? h`<li class="queue-empty">${r ? "Следующих треков нет" : "Очередь пуста"}</li>` : n.map((o, d) => {
      const p = this.queue[o];
      if (!p) return c;
      const g = o === this.store.queueIndex, m = l && this.queueDragOver === o && this.queueDragFrom !== o, b = r ? o - this.store.queueIndex + 1 : p.trackNumber ?? o + 1;
      return h`
              <li
                role="listitem"
                data-queue-index=${o}
                class="queue-item${s ? " queue-item--draggable" : ""}${g ? " is-active" : ""}${this.queueDragFrom === o ? " is-dragging" : ""}${m ? " is-drag-over" : ""}"
              >
                ${s ? h`
                      <button
                        type="button"
                        class="btn queue-drag-handle"
                        aria-label="Переместить"
                        @pointerdown=${(v) => this.onQueueDragStart(v, o)}
                      >${gt}</button>
                    ` : c}
                <span class="queue-index" @click=${() => this.playQueueIndex(o)}>
                  ${g && this.playing ? h`<span class="queue-playing">${q(!0)}</span>` : b}
                </span>
                <span class="queue-title-text" @click=${() => this.playQueueIndex(o)}>${p.title}</span>
                <span class="queue-actions">
                  ${this.renderHeart(p.slug)}
                  ${i && this.queue.length > 1 ? h`
                        <button
                          type="button"
                          class="btn btn--queue-remove"
                          @click=${(v) => {
        v.stopPropagation(), this.store.removeAt(o);
      }}
                          aria-label="Убрать из очереди"
                          title="Убрать"
                        >${ct}</button>
                      ` : c}
                  <span class="queue-duration">${Q(p.durationMs)}</span>
                </span>
              </li>
            `;
    })}
      </ol>
    `;
  }
  renderQueueSheet() {
    var s, r;
    if (!this.queueExpanded || this.mode !== "mini") return c;
    const t = ((s = this.current) == null ? void 0 : s.durationMs) ?? 0, i = this.queue.length;
    return h`
      <div
        class="queue-backdrop"
        @click=${() => this.closeQueueExpanded()}
        aria-hidden="true"
      ></div>
      <div
        class="queue-sheet"
        role="dialog"
        aria-label="Очередь воспроизведения"
        aria-modal="true"
      >
        <div
          class="queue-sheet__handle"
          @pointerdown=${this.onSheetPointerDown}
          @pointermove=${this.onSheetPointerMove}
          @pointerup=${this.onSheetPointerUp}
          @pointercancel=${this.onSheetPointerUp}
        >
          <span class="queue-sheet__grab" aria-hidden="true"></span>
        </div>
        <button
          type="button"
          class="btn btn--sheet-close"
          @click=${() => this.closeQueueExpanded()}
          aria-label="Закрыть"
        >${at}</button>

        ${this.queueNotice ? h`<div class="queue-toast" role="status">${this.queueNotice}</div>` : c}

        <div class="queue-sheet__body">
          <div class="queue-sheet__now">
            <div class="queue-sheet__cover-wrap">
              ${this.renderCover("lg")}
              <div class="cover-viz">${q(this.playing)}</div>
              <div class="cover-heart">${this.renderHeart((r = this.current) == null ? void 0 : r.slug)}</div>
            </div>
            <div class="meta meta--sheet">
              <div class="title">${this.displayTitle}</div>
              <div class="artist">${this.displayArtist}</div>
            </div>
            <div class="controls controls--center">
              <button class="btn${this.store.shuffle ? " is-active" : ""}" @click=${() => this.store.toggleShuffle()} aria-label="Случайный порядок">${W}</button>
              <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${K}</button>
              ${this.renderPlayButton("lg")}
              <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${Y}</button>
              <button class="btn${this.store.repeat !== "off" ? " is-active" : ""}" @click=${() => this.store.cycleRepeat()} aria-label=${this.repeatAriaLabel()}>${this.repeatIcon(this.store.repeat)}</button>
            </div>
            ${this.current ? this.renderProgress(t) : c}
          </div>

          <div class="queue-sheet__list">
            <div class="queue-sheet__list-header">
              <h2 class="queue-title">Очередь</h2>
              ${i > 0 ? h`<span class="queue-count">${St(i)}</span>` : c}
            </div>
            ${this.renderQueueList({ removable: !0, draggable: !0 })}
          </div>
        </div>
      </div>
    `;
  }
  onMiniMetaClick() {
    this.current && this.toggleQueueExpanded();
  }
  render() {
    var i, s, r, n, l;
    if (this.mode === "mini" && !this.visible && !this.current)
      return h`<div class="player player--hidden" aria-hidden="true"></div>`;
    if (this.mode === "embed") {
      const o = this.embedSource, p = (this.hasLiveAudio() ? (i = this.current) == null ? void 0 : i.durationMs : void 0) ?? (o == null ? void 0 : o.durationMs) ?? 0, g = p > 0 && !!o, m = this.isEmbedPlaying();
      return h`
        <div class="player player--embed" role="group" aria-label="Плеер">
          ${this.renderCover("md")}
          <div class="embed-body">
            <div class="embed-meta-row">
              <div class="meta">
                <div class="title">${this.displayTitle}</div>
                <div class="artist">${this.displayArtist}</div>
              </div>
              <div class="embed-controls">
                ${q(m)}
                ${this.renderPlayButton("lg", m)}
                ${this.renderHeart(this.track || (o == null ? void 0 : o.slug))}
              </div>
            </div>
            ${g ? this.renderProgress(p, !0) : c}
            ${this.error ? h`<p class="error-text">${this.error}</p>` : c}
          </div>
        </div>
      `;
    }
    if (this.mode === "full") {
      const o = ((s = this.current) == null ? void 0 : s.durationMs) ?? 0, d = !this.current && !this.loading;
      return h`
        <div class="player player--full" role="region" aria-label="Плеер альбома">
          ${this.loading ? h`<div class="state">Загрузка треков…</div>` : c}
          ${this.error ? h`<div class="state state--error">${this.error}</div>` : c}
          <div class="full-layout${this.trackInfoOpen ? " full-layout--info-open" : ""}">
            <aside class="full-now">
              <div class="full-cover-wrap">
                ${this.renderCover("lg")}
                ${q(this.playing)}
              </div>
              <div class="meta meta--full${d ? " meta--idle" : ""}">
                <div class="meta-row">
                  <div class="meta-text">
                    <div class="title">${this.displayTitle}</div>
                    <div class="artist">${this.displayArtist}</div>
                  </div>
                  <div class="meta-actions">
                    ${this.current ? this.renderTrackInfoButton(this.current.slug) : c}
                    ${this.renderHeart((r = this.current) == null ? void 0 : r.slug)}
                  </div>
                </div>
              </div>
              <div class="controls controls--center">
                <button class="btn${this.store.shuffle ? " is-active" : ""}" @click=${() => this.store.toggleShuffle()} aria-label="Случайный порядок" title="Случайный порядок">${W}</button>
                <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${K}</button>
                ${this.renderPlayButton("lg")}
                <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${Y}</button>
                <button class="btn${this.store.repeat !== "off" ? " is-active" : ""}" @click=${() => this.store.cycleRepeat()} aria-label=${this.repeatAriaLabel()} title=${this.repeatAriaLabel()}>${this.repeatIcon(this.store.repeat)}</button>
              </div>
              ${this.current ? this.renderProgress(o) : c}
              ${d && this.album ? h`<button class="btn-start-album" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.loadQueue(!0)}>Слушать альбом</button>` : c}
            </aside>
            <div class="full-tracks">
              <h2 class="queue-title">Треки</h2>
              ${this.renderAlbumTrackList()}
            </div>
            ${this.renderTrackInfoPanel()}
          </div>
        </div>
      `;
    }
    const t = ((n = this.current) == null ? void 0 : n.durationMs) ?? 0;
    return this.queueExpanded ? h`${this.renderQueueSheet()}` : h`
      <div class="player player--mini" role="region" aria-label="Мини-плеер">
        <div class="mini-row">
          <button type="button" class="mini-cover-btn" @click=${() => this.onMiniMetaClick()} aria-label="Развернуть плеер">
            ${this.renderCover("sm")}
          </button>
          <button type="button" class="mini-meta-btn" @click=${() => this.onMiniMetaClick()} aria-label="Развернуть плеер">
            <div class="meta">
              <div class="title">${this.displayTitle}</div>
              <div class="artist">${this.displayArtist}</div>
            </div>
          </button>
          ${this.current ? this.renderProgress(t, !0, !0) : c}
          <div class="mini-viz">${q(this.playing)}</div>
          <div class="mini-toolbar">
            <div class="controls">
              ${this.renderHeart((l = this.current) == null ? void 0 : l.slug)}
              <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${K}</button>
              ${this.renderPlayButton("md")}
              <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${Y}</button>
            </div>
            ${this.renderMiniOptions()}
          </div>
          <label class="volume-wrap" aria-label="Громкость">
            ${st}
            <input
              class="volume"
              type="range"
              min="0"
              max="100"
              .value=${String(Math.round(this.store.volume * 100))}
              @input=${(o) => this.store.setVolume(Number(o.target.value) / 100)}
            />
          </label>
        </div>
      </div>
    `;
  }
  unlockPlaybackPublic() {
    this.store.engine.unlockUserGesture();
  }
  playAlbumPublic(t, i) {
    if (this.store.engine.unlockUserGesture(), this.visible = !0, i != null && i.length) {
      const s = i.map((r) => f(this.apiBase, r));
      if (s.some((r) => {
        var n;
        return (n = r.stream) == null ? void 0 : n.url;
      })) {
        this.store.setQueue(s, 0, 0, !0, !0);
        return;
      }
    }
    this.playAlbum(t);
  }
  async playPlaylistPublic(t) {
    this.store.engine.unlockUserGesture(), this.visible = !0, await this.playPlaylist(t);
  }
  async restoreQueuePublic(t, i, s, r, n, l = !0) {
    if (this.client) {
      this.visible = !0, this.loading = !0;
      try {
        const { data: o } = await this.client.getAlbumTracks(t), d = new Map(o.map((m) => [m.slug, m]));
        let p = s.map((m) => d.get(m)).filter((m) => !!m);
        p.length === 0 && (p = o);
        const g = Math.max(0, Math.min(r, p.length - 1));
        this.store.restoreQueue(o, p, g, n, l), await this.store.waitUntilReady();
      } catch {
        await this.loadTrackPublic(i, n, l);
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  async loadTrackPublic(t, i, s = !0) {
    if (this.client) {
      this.loading = !0, this.error = "";
      try {
        const r = f(this.apiBase, await this.client.getTrack(t));
        this.store.loadTrack(r, i, s), this.visible = !0, await this.store.waitUntilReady();
      } catch {
        this.error = "Трек недоступен";
      } finally {
        this.isConnected && (this.loading = !1);
      }
    }
  }
  hasHealthySession() {
    const t = this.store.loadSaved(), i = this.store.getCurrentTrack(), s = this.store.engine.peekAudioElement();
    return !(t != null && t.trackSlug) || !i || i.slug !== t.trackSlug || !(s != null && s.src) || s.ended || s.error ? !1 : this.store.engine.hasPlayableSource() || s.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }
  async restoreSessionPublic() {
    if (this.restoreInFlight) {
      await this.restoreInFlight;
      return;
    }
    if (this.store.hasActiveSession()) {
      this.visible = !0;
      return;
    }
    const t = this.store.loadSaved();
    if (this.hasHealthySession()) {
      this.visible = !0, await this.store.waitUntilReady(), this.store.isNavigating() || this.store.syncSavedPlaybackPosition();
      return;
    }
    if (!(t != null && t.trackSlug)) return;
    const i = t.trackSlug;
    this.visible = !0, this.loading = !0;
    const s = this.store.shouldAutoplayRestore(t.wasPlaying === !0);
    this.restoreInFlight = (async () => {
      var r;
      try {
        t.albumSlug && ((r = t.queueSlugs) == null ? void 0 : r.length) > 1 ? await this.restoreQueuePublic(
          t.albumSlug,
          i,
          t.queueSlugs,
          t.queueIndex,
          t.positionMs,
          s
        ) : await this.loadTrackPublic(i, t.positionMs, s);
      } finally {
        this.isConnected && (this.loading = !1);
      }
    })();
    try {
      await this.restoreInFlight;
    } finally {
      this.restoreInFlight = null;
    }
  }
  /** @deprecated use loadTrackPublic or restoreSessionPublic */
  async resumePublic(t, i) {
    this.visible = !0, await this.loadTrackPublic(t, i, !0);
  }
  async togglePublic() {
    await this.mediaPlayPausePublic();
  }
  async mediaPlayPausePublic() {
    if (this.restoreInFlight && await this.restoreInFlight, this.store.engine.unlockUserGesture(), this.trySyncPlayPause() || (await this.restoreSessionPublic(), !this.store.getCurrentTrack()) || (await this.store.waitUntilReady(), this.visible = !0, this.store.toggleFromUserGesture() !== null)) return;
    const i = this.store.getCurrentTrack();
    if (!i) return;
    const s = this.store.loadSaved(), r = this.store.getPositionMs() || (s == null ? void 0 : s.positionMs) || 0;
    await this.loadTrackPublic(i.slug, r, !0);
  }
  async mediaStopPublic() {
    await this.restoreSessionPublic(), this.store.getCurrentTrack() && (await this.store.waitUntilReady(), this.visible = !0, await this.store.handleMediaStop());
  }
  showPublic() {
    this.visible = !0;
  }
  hasLiveSessionPublic() {
    return this.store.hasActiveSession();
  }
  completeNavigationPublic() {
    this.store.completeNavigation();
  }
  toggleQueueExpandedPublic() {
    this.toggleQueueExpanded();
  }
  closeQueueExpandedPublic() {
    this.closeQueueExpanded();
  }
  async addToQueuePublic(t) {
    if (!this.client) return !1;
    try {
      const i = f(this.apiBase, await this.client.getTrack(t)), s = this.store.addToQueue(i);
      return s && (this.visible = !0, this.showQueueNotice("Добавлено в очередь"), this.dispatchEvent(new CustomEvent("om:queue-add", { bubbles: !0, composed: !0, detail: { track: i } }))), s;
    } catch {
      return !1;
    }
  }
  async addToQueueNextPublic(t) {
    if (!this.client) return !1;
    try {
      const i = f(this.apiBase, await this.client.getTrack(t)), s = this.store.hasInQueue(t), r = this.store.playNext(i);
      return r && (this.visible = !0, this.showQueueNotice(s ? "Перемещено вверх" : "Будет следующим"), this.dispatchEvent(new CustomEvent("om:queue-add", { bubbles: !0, composed: !0, detail: { track: i, next: !0 } }))), r;
    } catch {
      return !1;
    }
  }
}
u(se, "styles", $e(qt)), u(se, "properties", {
  mode: { type: String, reflect: !0 },
  apiBase: { attribute: "api-base" },
  theme: { type: String, reflect: !0 },
  track: { type: String },
  album: { type: String },
  playlist: { type: String },
  albumCover: { attribute: "album-cover" },
  albumTitle: { attribute: "album-title" },
  albumArtist: { attribute: "album-artist" },
  autoPlay: { type: Boolean, attribute: "auto-play" },
  loading: { state: !0 },
  error: { state: !0 },
  visible: { state: !0 },
  seeking: { state: !0 },
  scrubMs: { state: !0 },
  previewTrack: { state: !0 },
  queueExpanded: { state: !0 },
  pageTracks: { state: !0 },
  queueNotice: { state: !0 },
  queueDragFrom: { state: !0 },
  queueDragOver: { state: !0 },
  trackInfoOpen: { state: !0 },
  trackInfoLoading: { state: !0 },
  trackInfoDetail: { state: !0 },
  trackInfoError: { state: !0 },
  trackInfoSlug: { state: !0 }
});
customElements.get("om-player") || customElements.define("om-player", se);
export {
  se as OmPlayer
};
