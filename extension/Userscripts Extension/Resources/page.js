(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function cubicInOut(t) {
        return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
    }

    function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const f = style.filter === 'none' ? '' : style.filter;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
        };
    }

    var logo = '<svg viewBox="0 0 181 24"><g fill="none"><path d="M11.733 1.545h3.153v11.54c0 1.318-.31 2.438-.929 3.358-.619.92-1.463 1.62-2.53 2.101-1.07.48-2.276.72-3.623.72-1.347 0-2.554-.24-3.622-.72s-1.912-1.18-2.531-2.1c-.62-.921-.93-2.04-.93-3.359V1.545h3.163V13.01c0 .715.174 1.328.524 1.836.35.509.82.898 1.414 1.168.594.27 1.255.405 1.982.405.733 0 1.396-.135 1.99-.405a3.366 3.366 0 0 0 1.415-1.168c.35-.508.524-1.12.524-1.836V1.545zM27.088 9.37l-2.812.307c-.12-.432-.374-.812-.763-1.142-.39-.33-.939-.494-1.65-.494-.641 0-1.18.139-1.614.417-.435.279-.65.64-.644 1.083-.005.38.135.692.422.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.478.628-1.137 1.118-1.978 1.47-.84.353-1.806.529-2.897.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.554-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.765-1.492l-2.232-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.901-1.41-.895-2.365 0-.807.221-1.507.664-2.1.444-.594 1.063-1.055 1.858-1.381.796-.327 1.72-.49 2.77-.49 1.534 0 2.743.328 3.627.984.883.656 1.43 1.538 1.64 2.646zm7.174 9.887c-1.313 0-2.445-.276-3.396-.827a5.533 5.533 0 0 1-2.195-2.335c-.511-1.006-.767-2.193-.767-3.563 0-1.346.256-2.53.767-3.55s1.232-1.815 2.16-2.386c.93-.57 2.019-.856 3.269-.856 1.074 0 2.065.231 2.974.694.91.463 1.638 1.182 2.186 2.156.549.975.823 2.23.823 3.763v.946h-9.12c.018 1.12.329 1.992.934 2.617s1.408.937 2.408.937c.664 0 1.24-.143 1.725-.43a2.409 2.409 0 0 0 1.044-1.257l2.881.324c-.273 1.136-.908 2.048-1.905 2.735-.997.688-2.26 1.032-3.788 1.032zm-3.29-8.037h6.154c-.006-.892-.283-1.628-.831-2.208-.549-.58-1.266-.869-2.152-.869-.92 0-1.668.304-2.242.912a3.324 3.324 0 0 0-.929 2.165zM41.24 19V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.248-.613 1.998-.613.17 0 .363.007.576.02.213.015.39.036.532.065v2.838a3.396 3.396 0 0 0-.618-.124 6.254 6.254 0 0 0-.813-.055c-.847 0-1.55.266-2.11.797-.56.531-.84 1.211-.84 2.041V19H41.24zm18.416-9.63l-2.813.306c-.12-.432-.374-.812-.763-1.142-.389-.33-.939-.494-1.649-.494-.642 0-1.18.139-1.615.417-.435.279-.65.64-.643 1.083-.006.38.135.692.421.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.477.628-1.137 1.118-1.977 1.47-.841.353-1.807.529-2.898.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.553-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.764-1.492l-2.233-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.9-1.41-.895-2.365 0-.807.221-1.507.665-2.1.443-.594 1.062-1.055 1.858-1.381.795-.327 1.718-.49 2.77-.49 1.534 0 2.742.328 3.626.984.883.656 1.43 1.538 1.64 2.646zm7.088 9.886c-1.301 0-2.42-.287-3.358-.861a5.69 5.69 0 0 1-2.16-2.386c-.503-1.018-.755-2.185-.755-3.503 0-1.336.256-2.51.767-3.524a5.79 5.79 0 0 1 2.17-2.383c.934-.573 2.04-.86 3.319-.86 1.068 0 2.011.194 2.83.583a4.91 4.91 0 0 1 1.96 1.641c.488.705.767 1.531.835 2.48H69.4a2.852 2.852 0 0 0-.847-1.58c-.446-.424-1.041-.636-1.786-.636-.948 0-1.714.374-2.296 1.121-.583.747-.874 1.783-.874 3.107 0 1.335.288 2.383.865 3.144.577.762 1.345 1.142 2.305 1.142.677 0 1.252-.193 1.726-.58.475-.385.777-.93.908-1.635h2.949c-.074.926-.347 1.744-.818 2.454-.472.71-1.114 1.267-1.927 1.67-.812.404-1.767.606-2.863.606zM73.439 19V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.248-.613 1.998-.613.17 0 .362.007.575.02.213.015.391.036.533.065v2.838a3.396 3.396 0 0 0-.618-.124 6.254 6.254 0 0 0-.814-.055c-.846 0-1.55.266-2.11.797-.559.531-.839 1.211-.839 2.041V19H73.44zm8.069 0V5.91h3.085V19h-3.085zm1.55-14.949c-.494 0-.915-.163-1.265-.49a1.558 1.558 0 0 1-.524-1.18c0-.466.175-.863.524-1.19a1.79 1.79 0 0 1 1.266-.49c.488 0 .907.164 1.257.49.35.327.524.724.524 1.19 0 .46-.175.853-.524 1.18-.35.327-.769.49-1.257.49zm3.254 19.858v-18h3.034v2.165h.179a5.93 5.93 0 0 1 .669-1.019c.287-.36.679-.67 1.176-.929.497-.258 1.13-.387 1.896-.387 1.012 0 1.925.258 2.74.775.816.517 1.464 1.276 1.944 2.276.48 1 .72 2.227.72 3.682 0 1.437-.236 2.659-.708 3.664-.471 1.006-1.113 1.773-1.926 2.302-.812.528-1.733.792-2.761.792-.75 0-1.372-.125-1.867-.375-.494-.25-.89-.552-1.188-.908a5.615 5.615 0 0 1-.695-1.01h-.128v6.972h-3.085zm3.025-11.454c0 1.267.267 2.29.802 3.072.534.781 1.292 1.172 2.275 1.172 1.017 0 1.79-.4 2.318-1.202.529-.801.793-1.815.793-3.042 0-1.222-.261-2.225-.784-3.009-.523-.784-1.298-1.176-2.327-1.176-.994 0-1.756.38-2.284 1.138-.528.758-.793 1.774-.793 3.047zm17.052-6.546v2.386h-2.583v6.768c0 .619.137 1.026.41 1.223.272.196.602.294.988.294.193 0 .37-.015.533-.043.162-.028.285-.054.37-.077l.52 2.412-.23.071a5.867 5.867 0 0 1-1.584.236c-1.16.034-2.133-.25-2.92-.852-.787-.603-1.177-1.52-1.172-2.753V8.295h-1.858V5.91h1.858V2.773h3.085v3.136h2.583zm11.281 3.46l-2.812.307c-.12-.432-.374-.812-.763-1.142-.39-.33-.939-.494-1.65-.494-.641 0-1.18.139-1.614.417-.435.279-.65.64-.644 1.083-.005.38.135.692.422.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.478.628-1.137 1.118-1.978 1.47-.84.353-1.806.529-2.897.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.554-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.765-1.492l-2.232-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.901-1.41-.895-2.365 0-.807.221-1.507.664-2.1.444-.594 1.063-1.055 1.858-1.381.796-.327 1.72-.49 2.77-.49 1.534 0 2.743.328 3.627.984.883.656 1.43 1.538 1.64 2.646z" fill="#FFF"/><path d="M133.207 6.344c-.08-.745-.412-1.324-.997-1.739-.585-.415-1.35-.622-2.292-.622-.989 0-1.762.214-2.319.643-.556.43-.838.973-.843 1.633-.006.482.139.882.434 1.197.296.315.672.567 1.13.754a9.48 9.48 0 0 0 1.402.452l1.636.409c.875.205 1.703.507 2.484.908a5.37 5.37 0 0 1 1.91 1.602c.49.668.737 1.507.737 2.518-.006 1.54-.588 2.786-1.748 3.738-1.159.951-2.784 1.427-4.875 1.427-2.034 0-3.656-.47-4.866-1.41-1.21-.94-1.847-2.277-1.91-4.01h3.112c.062.915.437 1.596 1.125 2.045.687.45 1.525.674 2.514.674 1.034 0 1.872-.23 2.514-.687.642-.457.966-1.058.972-1.802-.006-.676-.294-1.19-.865-1.538-.571-.35-1.328-.644-2.272-.883l-1.985-.511c-1.438-.37-2.573-.93-3.405-1.683-.833-.753-1.249-1.754-1.249-3.004 0-1.029.279-1.93.835-2.702.557-.773 1.32-1.374 2.289-1.803.968-.429 2.064-.643 3.285-.643 1.239 0 2.327.214 3.264.643.938.43 1.672 1.023 2.204 1.782.53.758.805 1.629.822 2.612h-3.043zm8.273 12.92c-1.25 0-2.292-.335-3.127-1.005-.836-.67-1.253-1.648-1.253-2.932 0-.983.237-1.746.711-2.289.475-.542 1.091-.937 1.85-1.184a11.827 11.827 0 0 1 2.407-.507l.805-.093c.743-.09 1.303-.176 1.68-.257.503-.108.754-.383.754-.827v-.05c0-.643-.19-1.14-.57-1.492-.382-.352-.93-.529-1.646-.529-.756 0-1.354.165-1.794.495-.44.33-.737.718-.89 1.167l-2.881-.409c.34-1.193 1.007-2.093 1.998-2.701.992-.608 2.175-.912 3.55-.912.625 0 1.25.073 1.875.221a5.349 5.349 0 0 1 1.717.733c.52.341.938.801 1.253 1.38.316.58.473 1.302.473 2.166V19h-2.966v-1.798h-.102c-.278.55-.731 1.032-1.36 1.444-.627.412-1.455.618-2.484.618zm.802-2.267c.931 0 1.67-.267 2.215-.801.546-.534.819-1.165.819-1.892v-1.543c-.131.108-.371.203-.72.286-.35.082-.72.152-1.113.209l-.997.145c-.687.096-1.261.285-1.722.566-.46.282-.69.718-.69 1.309 0 .568.208.997.622 1.287.415.29.943.434 1.586.434zm14.4-11.088v2.386h-2.718V19h-3.086V8.295h-1.934V5.91h1.934V4.673c0-.88.184-1.613.55-2.199a3.424 3.424 0 0 1 1.479-1.312c.62-.29 1.307-.435 2.062-.435.534 0 1.009.043 1.424.128l.378.083c.229.053.41.102.542.147l-.622 2.387a5.358 5.358 0 0 0-.486-.124 3.18 3.18 0 0 0-.665-.064c-.574 0-.98.138-1.218.413-.24.276-.358.67-.358 1.18V5.91h2.718zm4.293 13.355c-1.25 0-2.292-.335-3.128-1.005-.835-.67-1.252-1.648-1.252-2.932 0-.983.237-1.746.711-2.289.475-.542 1.091-.937 1.85-1.184a11.827 11.827 0 0 1 2.407-.507l.804-.093c.743-.09 1.304-.176 1.68-.257.504-.108.755-.383.755-.827v-.05c0-.643-.19-1.14-.571-1.492-.38-.352-.929-.529-1.645-.529-.756 0-1.354.165-1.794.495-.44.33-.737.718-.89 1.167l-2.881-.409c.34-1.193 1.007-2.093 1.998-2.701.992-.608 2.175-.912 3.55-.912.625 0 1.25.073 1.875.221a5.349 5.349 0 0 1 1.717.733c.52.341.938.801 1.253 1.38.316.58.473 1.302.473 2.166V19h-2.966v-1.798h-.102c-.278.55-.732 1.032-1.36 1.444-.627.412-1.455.618-2.484.618zm.801-2.267c.932 0 1.67-.267 2.216-.801.546-.534.818-1.165.818-1.892v-1.543c-.13.108-.37.203-.72.286-.35.082-.72.152-1.112.209l-.997.145c-.688.096-1.261.285-1.722.566-.46.282-.69.718-.69 1.309 0 .568.207.997.622 1.287.415.29.943.434 1.585.434zm7.77 2.003V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.249-.613 1.999-.613.17 0 .362.007.575.02.213.015.39.036.532.065v2.838a3.396 3.396 0 0 0-.617-.124 6.254 6.254 0 0 0-.814-.055c-.847 0-1.55.266-2.11.797-.56.531-.84 1.211-.84 2.041V19h-3.084zm8.069 0V5.91h3.085V19h-3.085zm1.551-14.949c-.494 0-.916-.163-1.265-.49a1.558 1.558 0 0 1-.525-1.18c0-.466.175-.863.525-1.19.349-.326.77-.49 1.265-.49.489 0 .908.164 1.257.49.35.327.524.724.524 1.19 0 .46-.174.853-.524 1.18-.35.327-.768.49-1.257.49z" fill="#96C3ED"/></g></svg>';

    /* src/page/App.svelte generated by Svelte v3.29.0 */

    function create_if_block(ctx) {
    	let div;
    	let html_tag;
    	let t;
    	let show_if;
    	let div_outro;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (show_if == null || dirty & /*state*/ 1) show_if = !!/*state*/ ctx[0].includes("init-error");
    		if (show_if) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			if_block.c();
    			html_tag = new HtmlTag(t);
    			attr(div, "class", "initializer svelte-1dnjz4x");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			html_tag.m(logo, div);
    			append(div, t);
    			if_block.m(div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx, dirty))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (div_outro) div_outro.end(1);
    			current = true;
    		},
    		o(local) {
    			div_outro = create_out_transition(div, blur, { duration: 350 });
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if_block.d();
    			if (detaching && div_outro) div_outro.end();
    		}
    	};
    }

    // (60:8) {:else}
    function create_else_block(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "Initializing app...";
    			attr(span, "class", "svelte-1dnjz4x");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (58:8) {#if state.includes("init-error")}
    function create_if_block_1(ctx) {
    	let span;

    	return {
    		c() {
    			span = element("span");
    			span.textContent = "Failed to initialize app, check the console!";
    			attr(span, "class", "svelte-1dnjz4x");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let show_if = /*state*/ ctx[0].includes("init");
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = show_if && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", preventKeyCommands),
    					listen(window, "resize", /*windowResize*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*state*/ 1) show_if = /*state*/ ctx[0].includes("init");

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*state*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function preventKeyCommands(e) {
    	if (e.metaKey && (e.code === "KeyS" || e.code === "KeyF")) {
    		return e.preventDefault();
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let state = ["init"];

    	// app proportions can get messed up when opening/closing new tabs
    	async function windowResize() {
    		document.documentElement.style.height = "100vh";

    		// if tick is omitted, the style change won't apply
    		await tick();

    		document.documentElement.removeAttribute("style");
    	}

    	onMount(() => {
    		setTimeout(
    			() => {
    				$$invalidate(0, state = []);
    			},
    			2000
    		);
    	});

    	return [state, windowResize];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.getElementById("app"),
        props: {}
    });

}());