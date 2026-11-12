export class SvgAvatar {
  constructor(host) {
    this.host = host;
    host.innerHTML = [
      '<svg class="portrait" viewBox="0 0 400 390" role="img" aria-label="原创红褐长发少女形象">',
      '<defs>',
      '<linearGradient id="hair" x2="1" y2="1">',
      '<stop stop-color="#703f39"/>',
      '<stop offset="1" stop-color="#291a22"/>',
      '</linearGradient>',
      '<linearGradient id="coat" x2="0" y2="1">',
      '<stop stop-color="#eee2dd"/>',
      '<stop offset="1" stop-color="#897e85"/>',
      '</linearGradient>',
      '</defs>',
      '<g class="breathing">',
      '<path fill="url(#hair)" d="M104 370 Q74 263 98 125 Q99 29 200 25 Q300 25 303 136 L326 383Z"/>',
      '<path fill="#251e2c" d="M125 294 Q200 264 275 295 L306 390 H93Z"/>',
      '<path fill="url(#coat)" d="M139 277 L169 265 199 337 229 265 266 280 298 390H104Z"/>',
      '<path fill="#ddbab0" d="M178 231H222L228 281 200 311 172 279Z"/>',
      '<path fill="#f2d4c4" d="M128 133 Q122 220 158 246 Q200 276 242 244 Q277 214 270 129 Q200 76 128 133Z"/>',
      '<path fill="url(#hair)" d="M105 156 Q97 38 199 39 Q299 34 285 168 L258 117 253 154 215 87 Q205 136 127 164 L142 112Z"/>',
      '<path fill="#683e39" d="M114 134Q102 263 128 348 L147 356Q129 218 143 142ZM270 126Q302 261 277 361L252 368Q279 232 255 137Z"/>',
      '<g class="brows" fill="none" stroke="#724340" stroke-width="3" stroke-linecap="round">',
      '<path d="M148 168 Q163 160 178 166"/>',
      '<path d="M222 166 Q238 160 252 168"/>',
      '</g>',
      '<g class="eyes">',
      '<path fill="#fff5ec" d="M145 181 Q162 168 180 182 Q163 197 147 187ZM220 182Q238 168 255 181L253 187Q237 197 220 182"/>',
      '<g fill="#66838a" stroke="#36404d" stroke-width="2">',
      '<ellipse cx="165" cy="183" rx="8" ry="10"/>',
      '<ellipse cx="236" cy="183" rx="8" ry="10"/>',
      '</g>',
      '<g fill="#fff">',
      '<circle cx="162" cy="179" r="3"/>',
      '<circle cx="233" cy="179" r="3"/>',
      '</g>',
      '<path d="M145 180Q162 168 180 180M220 180Q238 168 255 180" fill="none" stroke="#503035" stroke-width="3"/>',
      '</g>',
      '<path d="M199 190L195 210 201 212" fill="none" stroke="#c6978e" stroke-width="2"/>',
      '<g class="blush" fill="#d67a81" opacity="0">',
      '<ellipse cx="152" cy="212" rx="17" ry="7"/>',
      '<ellipse cx="248" cy="212" rx="17" ry="7"/>',
      '</g>',
      '<path class="mouth" d="M188 231Q200 237 212 231" fill="none" stroke="#9d595f" stroke-width="2.5" stroke-linecap="round"/>',
      '<ellipse class="mouth-open" cx="200" cy="232" rx="7" ry="5" fill="#79444d"/>',
      '<path d="M168 283L149 314 176 325 159 337 186 390M231 282L252 314 226 325 241 338 216 390" fill="none" stroke="#b3a5aa" stroke-width="3"/>',
      '<path fill="#8a3441" d="M190 310H210L205 325 214 378 200 388 186 378 195 325Z"/>',
      '</g>',
      '</svg>'
    ].join('');
    this.timer = setInterval(() => {
      host.classList.add('blink');
      setTimeout(() => host.classList.remove('blink'), 140);
    }, 3600 + Math.random() * 2200);
  }
  setEmotion(e) {
    this.host.dataset.emotion = e;
  }
  setMouth(value) {
    this.host.classList.toggle('talking', value > 0.25);
  }
  destroy() {
    clearInterval(this.timer);
  }
}
