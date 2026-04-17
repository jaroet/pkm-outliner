
/* 
 * JaRoet PKM Globals
 * Sets up the Jaroet namespace and binds HTM to React.
 */

window.Jaroet = {
    Services: {},
    Components: {},
    Hooks: { },
    APP_VERSION: '0.7.3',
    Utils: {
        // Helper to get caret coordinates for autocomplete popup
        getCaretCoordinates: (element, position) => {
            const div = document.createElement('div');
            const style = window.getComputedStyle(element);
            Array.from(style).forEach(prop => div.style.setProperty(prop, style.getPropertyValue(prop)));
            div.style.position = 'absolute'; div.style.visibility = 'hidden'; div.style.whiteSpace = 'pre-wrap';
            div.style.top = '0'; div.style.left = '0';
            div.textContent = element.value.substring(0, position);
            const span = document.createElement('span'); span.textContent = element.value.substring(position) || '.';
            div.appendChild(span);
            document.body.appendChild(div);
            const coordinates = { top: span.offsetTop + parseInt(style.borderTopWidth), left: span.offsetLeft + parseInt(style.borderLeftWidth), height: parseInt(style.lineHeight) };
            document.body.removeChild(div);
            return coordinates;
        }
    }
};

// Bind HTM to React.createElement
// This allows us to use `html` tagged templates instead of JSX
window.html = htm.bind(React.createElement);

// Polyfill for randomUUID in older environments
if(typeof crypto==='undefined')window.crypto={};
if(!window.crypto.randomUUID){window.crypto.randomUUID=function(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0,v=c=='x'?r:(r&0x3|0x8);return v.toString(16)})}};
