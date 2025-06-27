const now = Date.now();
const renderedAgo = document.querySelector('#extension-rendered-ago')!;

setInterval(() => {
  const seconds = Math.round((Date.now() - now) / 1000);
  renderedAgo.textContent = seconds === 1 ? `1 second` : `${seconds} seconds`;
}, 1000);

let count = 0;
const countText = document.querySelector('#extension-button-count')!;
const button = document.querySelector('cx-button')!;

button.addEventListener('click', () => {
  count += 1;
  countText.textContent = `clicked ${count === 1 ? `1 time` : `${count} times`}`;
});
