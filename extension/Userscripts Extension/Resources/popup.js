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
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
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

    /* src/shared/Components/IconButton.svelte generated by Svelte v3.29.0 */

    function create_fragment(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.disabled = /*disabled*/ ctx[1];
    			set_style(button, "--svg-fill", /*color*/ ctx[0]);
    			attr(button, "title", /*title*/ ctx[3]);
    			attr(button, "class", "svelte-11cw0r2");
    			toggle_class(button, "notification", /*notification*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			button.innerHTML = /*icon*/ ctx[2];

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*icon*/ 4) button.innerHTML = /*icon*/ ctx[2];
    			if (dirty & /*disabled*/ 2) {
    				button.disabled = /*disabled*/ ctx[1];
    			}

    			if (dirty & /*color*/ 1) {
    				set_style(button, "--svg-fill", /*color*/ ctx[0]);
    			}

    			if (dirty & /*title*/ 8) {
    				attr(button, "title", /*title*/ ctx[3]);
    			}

    			if (dirty & /*notification*/ 16) {
    				toggle_class(button, "notification", /*notification*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { color = "currentColor" } = $$props;
    	let { disabled = false } = $$props;
    	let { icon } = $$props;
    	let { title = undefined } = $$props;
    	let { notification = false } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("title" in $$props) $$invalidate(3, title = $$props.title);
    		if ("notification" in $$props) $$invalidate(4, notification = $$props.notification);
    	};

    	return [color, disabled, icon, title, notification, click_handler];
    }

    class IconButton extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			color: 0,
    			disabled: 1,
    			icon: 2,
    			title: 3,
    			notification: 4
    		});
    	}
    }

    function quintInOut(t) {
        if ((t *= 2) < 1)
            return 0.5 * t * t * t * t * t;
        return 0.5 * ((t -= 2) * t * t * t * t + 2);
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    var iconLoader = '<svg viewBox="0 0 38 38" stroke="#fff">    <g fill="none" fill-rule="evenodd">        <g transform="translate(1 1)" stroke->            <circle stroke-opacity=".5" cx="18" cy="18" r="18"/>            <path d="M36 18c0-9.94-8.06-18-18-18">                <animateTransform                    attributeName="transform"                    type="rotate"                    from="0 18 18"                    to="360 18 18"                    dur="750ms"                    repeatCount="indefinite"/>            </path>        </g>    </g></svg>';

    /* src/shared/Components/Loader.svelte generated by Svelte v3.29.0 */

    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Fetching resources, ");
    			span = element("span");
    			span.textContent = "cancel request";
    			attr(span, "class", "link");
    			attr(div, "class", "svelte-1v2lr3c");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, span);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*abortClick*/ ctx[1])) /*abortClick*/ ctx[1].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div;
    	let html_tag;
    	let t;
    	let div_outro;
    	let current;
    	let if_block = /*abort*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			if (if_block) if_block.c();
    			html_tag = new HtmlTag(t);
    			attr(div, "class", "loader svelte-1v2lr3c");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			html_tag.m(iconLoader, div);
    			append(div, t);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*abort*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (div_outro) div_outro.end(1);
    			current = true;
    		},
    		o(local) {
    			div_outro = create_out_transition(div, fade, { duration: 125 });
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			if (detaching && div_outro) div_outro.end();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { abort = false } = $$props;

    	let { abortClick = () => {
    		
    	} } = $$props;

    	$$self.$$set = $$props => {
    		if ("abort" in $$props) $$invalidate(0, abort = $$props.abort);
    		if ("abortClick" in $$props) $$invalidate(1, abortClick = $$props.abortClick);
    	};

    	return [abort, abortClick];
    }

    class Loader extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { abort: 0, abortClick: 1 });
    	}
    }

    /* src/shared/Components/Tag.svelte generated by Svelte v3.29.0 */

    function create_fragment$2(ctx) {
    	let div;
    	let div_class_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", div_class_value = "script__tag " + (/*type*/ ctx[0] ? "script__tag--" + /*type*/ ctx[0] : "") + " svelte-p9vdxd");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*type*/ 1 && div_class_value !== (div_class_value = "script__tag " + (/*type*/ ctx[0] ? "script__tag--" + /*type*/ ctx[0] : "") + " svelte-p9vdxd")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { type = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    	};

    	return [type];
    }

    class Tag extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { type: 0 });
    	}
    }

    /* src/popup/Components/PopupItem.svelte generated by Svelte v3.29.0 */

    function create_if_block$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "SUB";
    			attr(div, "class", "subframe svelte-wpje9c");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let span;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let t3;
    	let tag;
    	let div1_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*subframe*/ ctx[3] && create_if_block$1();
    	tag = new Tag({ props: { type: /*type*/ ctx[2] } });

    	return {
    		c() {
    			div1 = element("div");
    			span = element("span");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*name*/ ctx[1]);
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			create_component(tag.$$.fragment);
    			attr(span, "class", "svelte-wpje9c");
    			attr(div0, "class", "truncate svelte-wpje9c");
    			attr(div1, "class", div1_class_value = "item " + (/*enabled*/ ctx[0] ? "enabled" : "disabled") + " svelte-wpje9c");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, span);
    			append(div1, t0);
    			append(div1, div0);
    			append(div0, t1);
    			append(div1, t2);
    			if (if_block) if_block.m(div1, null);
    			append(div1, t3);
    			mount_component(tag, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div1, "click", /*click_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 2) set_data(t1, /*name*/ ctx[1]);

    			if (/*subframe*/ ctx[3]) {
    				if (if_block) ; else {
    					if_block = create_if_block$1();
    					if_block.c();
    					if_block.m(div1, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const tag_changes = {};
    			if (dirty & /*type*/ 4) tag_changes.type = /*type*/ ctx[2];
    			tag.$set(tag_changes);

    			if (!current || dirty & /*enabled*/ 1 && div1_class_value !== (div1_class_value = "item " + (/*enabled*/ ctx[0] ? "enabled" : "disabled") + " svelte-wpje9c")) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tag.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tag.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block) if_block.d();
    			destroy_component(tag);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { enabled = false } = $$props;
    	let { name } = $$props;
    	let { type } = $$props;
    	let { subframe } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("enabled" in $$props) $$invalidate(0, enabled = $$props.enabled);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("subframe" in $$props) $$invalidate(3, subframe = $$props.subframe);
    	};

    	return [enabled, name, type, subframe, click_handler];
    }

    class PopupItem extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			enabled: 0,
    			name: 1,
    			type: 2,
    			subframe: 3
    		});
    	}
    }

    var iconArrowLeft = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18"><path d="M8.4 17.5l1.692-1.712-5.496-5.574H24V7.786H4.596l5.508-5.574L8.4.5 0 9z" fill-rule="nonzero"/></svg>';

    var iconUpdate = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16"><path d="M19.35 6.04A7.49 7.49 0 0012 0C9.11 0 6.6 1.64 5.35 4.04A5.994 5.994 0 000 10c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 14H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0112 2c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0122 11c0 1.65-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55V6z" fill-rule="nonzero"/></svg>';

    /* src/popup/Components/UpdateView.svelte generated by Svelte v3.29.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (134:12) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let html_tag;
    	let t0;
    	let div0;
    	let t1;
    	let br;
    	let t2;
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div1 = element("div");
    			t0 = space();
    			div0 = element("div");
    			t1 = text("There are no file updates available\n                        ");
    			br = element("br");
    			t2 = space();
    			span = element("span");
    			span.textContent = "Check Again";
    			html_tag = new HtmlTag(t0);
    			attr(span, "class", "link svelte-1lm5x78");
    			attr(div0, "class", "svelte-1lm5x78");
    			attr(div1, "class", "none svelte-1lm5x78");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			html_tag.m(iconUpdate, div1);
    			append(div1, t0);
    			append(div1, div0);
    			append(div0, t1);
    			append(div0, br);
    			append(div0, t2);
    			append(div0, span);

    			if (!mounted) {
    				dispose = listen(span, "click", function () {
    					if (is_function(/*checkClick*/ ctx[4])) /*checkClick*/ ctx[4].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (123:12) {#if updates.length}
    function create_if_block_1(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let p;
    	let t2;
    	let div;
    	let mounted;
    	let dispose;
    	let each_value = /*updates*/ ctx[1];
    	const get_key = ctx => /*item*/ ctx[6].name;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			p = element("p");
    			p.textContent = "Be sure you trust the authors before downloading remote code to your machine.";
    			t2 = space();
    			div = element("div");
    			div.textContent = "Update All";
    			attr(p, "class", "svelte-1lm5x78");
    			attr(div, "class", "link svelte-1lm5x78");
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t0, anchor);
    			insert(target, p, anchor);
    			insert(target, t2, anchor);
    			insert(target, div, anchor);

    			if (!mounted) {
    				dispose = listen(div, "click", function () {
    					if (is_function(/*updateClick*/ ctx[3])) /*updateClick*/ ctx[3].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*updates*/ 2) {
    				const each_value = /*updates*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t0.parentNode, destroy_block, create_each_block, t0, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(t0);
    			if (detaching) detach(p);
    			if (detaching) detach(t2);
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (120:8) {#if loading}
    function create_if_block$2(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({});

    	return {
    		c() {
    			create_component(loader.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};
    }

    // (124:16) {#each updates as item (item.name)}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*item*/ ctx[6].name + "";
    	let t0;
    	let t1;
    	let a;
    	let t2;
    	let a_href_value;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			a = element("a");
    			t2 = text("Source");
    			attr(div0, "class", "truncate svelte-1lm5x78");
    			attr(a, "href", a_href_value = /*item*/ ctx[6].url);
    			attr(a, "target", "_blank");
    			attr(a, "class", "svelte-1lm5x78");
    			attr(div1, "class", "item svelte-1lm5x78");
    			this.first = div1;
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);
    			append(div1, a);
    			append(a, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*updates*/ 2 && t0_value !== (t0_value = /*item*/ ctx[6].name + "")) set_data(t0, t0_value);

    			if (dirty & /*updates*/ 2 && a_href_value !== (a_href_value = /*item*/ ctx[6].url)) {
    				attr(a, "href", a_href_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let iconbutton;
    	let t1;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let div2_transition;
    	let current;

    	iconbutton = new IconButton({
    			props: { icon: iconArrowLeft, title: "Go back" }
    		});

    	iconbutton.$on("click", function () {
    		if (is_function(/*closeClick*/ ctx[2])) /*closeClick*/ ctx[2].apply(this, arguments);
    	});

    	const if_block_creators = [create_if_block$2, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[0]) return 0;
    		if (/*updates*/ ctx[1].length) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("Userscript Updates\n        ");
    			create_component(iconbutton.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			if_block.c();
    			attr(div0, "class", "view__header svelte-1lm5x78");
    			attr(div1, "class", "view__body svelte-1lm5x78");
    			attr(div2, "class", "view view--updates svelte-1lm5x78");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, t0);
    			mount_component(iconbutton, div0, null);
    			append(div2, t1);
    			append(div2, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(iconbutton.$$.fragment, local);
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[5], {}, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton.$$.fragment, local);
    			transition_out(if_block);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[5], {}, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_component(iconbutton);
    			if_blocks[current_block_type_index].d();
    			if (detaching && div2_transition) div2_transition.end();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { loading = false } = $$props;
    	let { updates = [] } = $$props;
    	let { closeClick } = $$props;
    	let { updateClick } = $$props;
    	let { checkClick } = $$props;

    	function slide(node, params) {
    		return {
    			delay: params.delay || 0,
    			duration: params.duration || 150,
    			easing: params.easing || quintInOut,
    			css: t => `transform: translateX(${(t - 1) * 18}rem);`
    		};
    	}

    	$$self.$$set = $$props => {
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    		if ("updates" in $$props) $$invalidate(1, updates = $$props.updates);
    		if ("closeClick" in $$props) $$invalidate(2, closeClick = $$props.closeClick);
    		if ("updateClick" in $$props) $$invalidate(3, updateClick = $$props.updateClick);
    		if ("checkClick" in $$props) $$invalidate(4, checkClick = $$props.checkClick);
    	};

    	return [loading, updates, closeClick, updateClick, checkClick, slide];
    }

    class UpdateView extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			loading: 0,
    			updates: 1,
    			closeClick: 2,
    			updateClick: 3,
    			checkClick: 4
    		});
    	}
    }

    var iconPower = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13.333 0h-2.666v13.333h2.666V0zm6.44 2.893L17.88 4.787A9.227 9.227 0 0121.333 12 9.327 9.327 0 0112 21.333 9.327 9.327 0 012.667 12c0-2.92 1.346-5.52 3.44-7.227l-1.88-1.88C1.64 5.093 0 8.347 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-3.653-1.64-6.907-4.227-9.107z" fill-rule="nonzero"/></svg>';

    var iconOpen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20"><path d="M21.6 2.875H12L9.6.5H2.4A2.384 2.384 0 00.012 2.875L0 17.125C0 18.431 1.08 19.5 2.4 19.5h19.2c1.32 0 2.4-1.069 2.4-2.375V5.25c0-1.306-1.08-2.375-2.4-2.375zm0 14.25H2.4V5.25h19.2v11.875z" fill-rule="nonzero"/></svg>';

    var iconClear = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm4.9 6L12 10.9 7.1 6 6 7.1l4.9 4.9L6 16.9 7.1 18l4.9-4.9 4.9 4.9 1.1-1.1-4.9-4.9L18 7.1 16.9 6z" fill-rule="evenodd"/></svg>';

    var logo = '<svg viewBox="0 0 181 24"><g fill="none"><path d="M11.733 1.545h3.153v11.54c0 1.318-.31 2.438-.929 3.358-.619.92-1.463 1.62-2.53 2.101-1.07.48-2.276.72-3.623.72-1.347 0-2.554-.24-3.622-.72s-1.912-1.18-2.531-2.1c-.62-.921-.93-2.04-.93-3.359V1.545h3.163V13.01c0 .715.174 1.328.524 1.836.35.509.82.898 1.414 1.168.594.27 1.255.405 1.982.405.733 0 1.396-.135 1.99-.405a3.366 3.366 0 0 0 1.415-1.168c.35-.508.524-1.12.524-1.836V1.545zM27.088 9.37l-2.812.307c-.12-.432-.374-.812-.763-1.142-.39-.33-.939-.494-1.65-.494-.641 0-1.18.139-1.614.417-.435.279-.65.64-.644 1.083-.005.38.135.692.422.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.478.628-1.137 1.118-1.978 1.47-.84.353-1.806.529-2.897.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.554-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.765-1.492l-2.232-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.901-1.41-.895-2.365 0-.807.221-1.507.664-2.1.444-.594 1.063-1.055 1.858-1.381.796-.327 1.72-.49 2.77-.49 1.534 0 2.743.328 3.627.984.883.656 1.43 1.538 1.64 2.646zm7.174 9.887c-1.313 0-2.445-.276-3.396-.827a5.533 5.533 0 0 1-2.195-2.335c-.511-1.006-.767-2.193-.767-3.563 0-1.346.256-2.53.767-3.55s1.232-1.815 2.16-2.386c.93-.57 2.019-.856 3.269-.856 1.074 0 2.065.231 2.974.694.91.463 1.638 1.182 2.186 2.156.549.975.823 2.23.823 3.763v.946h-9.12c.018 1.12.329 1.992.934 2.617s1.408.937 2.408.937c.664 0 1.24-.143 1.725-.43a2.409 2.409 0 0 0 1.044-1.257l2.881.324c-.273 1.136-.908 2.048-1.905 2.735-.997.688-2.26 1.032-3.788 1.032zm-3.29-8.037h6.154c-.006-.892-.283-1.628-.831-2.208-.549-.58-1.266-.869-2.152-.869-.92 0-1.668.304-2.242.912a3.324 3.324 0 0 0-.929 2.165zM41.24 19V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.248-.613 1.998-.613.17 0 .363.007.576.02.213.015.39.036.532.065v2.838a3.396 3.396 0 0 0-.618-.124 6.254 6.254 0 0 0-.813-.055c-.847 0-1.55.266-2.11.797-.56.531-.84 1.211-.84 2.041V19H41.24zm18.416-9.63l-2.813.306c-.12-.432-.374-.812-.763-1.142-.389-.33-.939-.494-1.649-.494-.642 0-1.18.139-1.615.417-.435.279-.65.64-.643 1.083-.006.38.135.692.421.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.477.628-1.137 1.118-1.977 1.47-.841.353-1.807.529-2.898.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.553-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.764-1.492l-2.233-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.9-1.41-.895-2.365 0-.807.221-1.507.665-2.1.443-.594 1.062-1.055 1.858-1.381.795-.327 1.718-.49 2.77-.49 1.534 0 2.742.328 3.626.984.883.656 1.43 1.538 1.64 2.646zm7.088 9.886c-1.301 0-2.42-.287-3.358-.861a5.69 5.69 0 0 1-2.16-2.386c-.503-1.018-.755-2.185-.755-3.503 0-1.336.256-2.51.767-3.524a5.79 5.79 0 0 1 2.17-2.383c.934-.573 2.04-.86 3.319-.86 1.068 0 2.011.194 2.83.583a4.91 4.91 0 0 1 1.96 1.641c.488.705.767 1.531.835 2.48H69.4a2.852 2.852 0 0 0-.847-1.58c-.446-.424-1.041-.636-1.786-.636-.948 0-1.714.374-2.296 1.121-.583.747-.874 1.783-.874 3.107 0 1.335.288 2.383.865 3.144.577.762 1.345 1.142 2.305 1.142.677 0 1.252-.193 1.726-.58.475-.385.777-.93.908-1.635h2.949c-.074.926-.347 1.744-.818 2.454-.472.71-1.114 1.267-1.927 1.67-.812.404-1.767.606-2.863.606zM73.439 19V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.248-.613 1.998-.613.17 0 .362.007.575.02.213.015.391.036.533.065v2.838a3.396 3.396 0 0 0-.618-.124 6.254 6.254 0 0 0-.814-.055c-.846 0-1.55.266-2.11.797-.559.531-.839 1.211-.839 2.041V19H73.44zm8.069 0V5.91h3.085V19h-3.085zm1.55-14.949c-.494 0-.915-.163-1.265-.49a1.558 1.558 0 0 1-.524-1.18c0-.466.175-.863.524-1.19a1.79 1.79 0 0 1 1.266-.49c.488 0 .907.164 1.257.49.35.327.524.724.524 1.19 0 .46-.175.853-.524 1.18-.35.327-.769.49-1.257.49zm3.254 19.858v-18h3.034v2.165h.179a5.93 5.93 0 0 1 .669-1.019c.287-.36.679-.67 1.176-.929.497-.258 1.13-.387 1.896-.387 1.012 0 1.925.258 2.74.775.816.517 1.464 1.276 1.944 2.276.48 1 .72 2.227.72 3.682 0 1.437-.236 2.659-.708 3.664-.471 1.006-1.113 1.773-1.926 2.302-.812.528-1.733.792-2.761.792-.75 0-1.372-.125-1.867-.375-.494-.25-.89-.552-1.188-.908a5.615 5.615 0 0 1-.695-1.01h-.128v6.972h-3.085zm3.025-11.454c0 1.267.267 2.29.802 3.072.534.781 1.292 1.172 2.275 1.172 1.017 0 1.79-.4 2.318-1.202.529-.801.793-1.815.793-3.042 0-1.222-.261-2.225-.784-3.009-.523-.784-1.298-1.176-2.327-1.176-.994 0-1.756.38-2.284 1.138-.528.758-.793 1.774-.793 3.047zm17.052-6.546v2.386h-2.583v6.768c0 .619.137 1.026.41 1.223.272.196.602.294.988.294.193 0 .37-.015.533-.043.162-.028.285-.054.37-.077l.52 2.412-.23.071a5.867 5.867 0 0 1-1.584.236c-1.16.034-2.133-.25-2.92-.852-.787-.603-1.177-1.52-1.172-2.753V8.295h-1.858V5.91h1.858V2.773h3.085v3.136h2.583zm11.281 3.46l-2.812.307c-.12-.432-.374-.812-.763-1.142-.39-.33-.939-.494-1.65-.494-.641 0-1.18.139-1.614.417-.435.279-.65.64-.644 1.083-.005.38.135.692.422.933.287.241.763.436 1.428.584l2.233.477c2.449.534 3.676 1.716 3.682 3.546 0 .823-.239 1.55-.716 2.177-.478.628-1.137 1.118-1.978 1.47-.84.353-1.806.529-2.897.529-1.608 0-2.898-.338-3.87-1.015-.971-.676-1.554-1.613-1.747-2.812l3.009-.29c.267 1.193 1.133 1.79 2.6 1.79.732 0 1.322-.15 1.768-.447.446-.299.669-.672.669-1.121 0-.733-.588-1.23-1.765-1.492l-2.232-.468c-1.256-.262-2.185-.704-2.787-1.326-.603-.622-.901-1.41-.895-2.365 0-.807.221-1.507.664-2.1.444-.594 1.063-1.055 1.858-1.381.796-.327 1.72-.49 2.77-.49 1.534 0 2.743.328 3.627.984.883.656 1.43 1.538 1.64 2.646z" fill="#FFF"/><path d="M133.207 6.344c-.08-.745-.412-1.324-.997-1.739-.585-.415-1.35-.622-2.292-.622-.989 0-1.762.214-2.319.643-.556.43-.838.973-.843 1.633-.006.482.139.882.434 1.197.296.315.672.567 1.13.754a9.48 9.48 0 0 0 1.402.452l1.636.409c.875.205 1.703.507 2.484.908a5.37 5.37 0 0 1 1.91 1.602c.49.668.737 1.507.737 2.518-.006 1.54-.588 2.786-1.748 3.738-1.159.951-2.784 1.427-4.875 1.427-2.034 0-3.656-.47-4.866-1.41-1.21-.94-1.847-2.277-1.91-4.01h3.112c.062.915.437 1.596 1.125 2.045.687.45 1.525.674 2.514.674 1.034 0 1.872-.23 2.514-.687.642-.457.966-1.058.972-1.802-.006-.676-.294-1.19-.865-1.538-.571-.35-1.328-.644-2.272-.883l-1.985-.511c-1.438-.37-2.573-.93-3.405-1.683-.833-.753-1.249-1.754-1.249-3.004 0-1.029.279-1.93.835-2.702.557-.773 1.32-1.374 2.289-1.803.968-.429 2.064-.643 3.285-.643 1.239 0 2.327.214 3.264.643.938.43 1.672 1.023 2.204 1.782.53.758.805 1.629.822 2.612h-3.043zm8.273 12.92c-1.25 0-2.292-.335-3.127-1.005-.836-.67-1.253-1.648-1.253-2.932 0-.983.237-1.746.711-2.289.475-.542 1.091-.937 1.85-1.184a11.827 11.827 0 0 1 2.407-.507l.805-.093c.743-.09 1.303-.176 1.68-.257.503-.108.754-.383.754-.827v-.05c0-.643-.19-1.14-.57-1.492-.382-.352-.93-.529-1.646-.529-.756 0-1.354.165-1.794.495-.44.33-.737.718-.89 1.167l-2.881-.409c.34-1.193 1.007-2.093 1.998-2.701.992-.608 2.175-.912 3.55-.912.625 0 1.25.073 1.875.221a5.349 5.349 0 0 1 1.717.733c.52.341.938.801 1.253 1.38.316.58.473 1.302.473 2.166V19h-2.966v-1.798h-.102c-.278.55-.731 1.032-1.36 1.444-.627.412-1.455.618-2.484.618zm.802-2.267c.931 0 1.67-.267 2.215-.801.546-.534.819-1.165.819-1.892v-1.543c-.131.108-.371.203-.72.286-.35.082-.72.152-1.113.209l-.997.145c-.687.096-1.261.285-1.722.566-.46.282-.69.718-.69 1.309 0 .568.208.997.622 1.287.415.29.943.434 1.586.434zm14.4-11.088v2.386h-2.718V19h-3.086V8.295h-1.934V5.91h1.934V4.673c0-.88.184-1.613.55-2.199a3.424 3.424 0 0 1 1.479-1.312c.62-.29 1.307-.435 2.062-.435.534 0 1.009.043 1.424.128l.378.083c.229.053.41.102.542.147l-.622 2.387a5.358 5.358 0 0 0-.486-.124 3.18 3.18 0 0 0-.665-.064c-.574 0-.98.138-1.218.413-.24.276-.358.67-.358 1.18V5.91h2.718zm4.293 13.355c-1.25 0-2.292-.335-3.128-1.005-.835-.67-1.252-1.648-1.252-2.932 0-.983.237-1.746.711-2.289.475-.542 1.091-.937 1.85-1.184a11.827 11.827 0 0 1 2.407-.507l.804-.093c.743-.09 1.304-.176 1.68-.257.504-.108.755-.383.755-.827v-.05c0-.643-.19-1.14-.571-1.492-.38-.352-.929-.529-1.645-.529-.756 0-1.354.165-1.794.495-.44.33-.737.718-.89 1.167l-2.881-.409c.34-1.193 1.007-2.093 1.998-2.701.992-.608 2.175-.912 3.55-.912.625 0 1.25.073 1.875.221a5.349 5.349 0 0 1 1.717.733c.52.341.938.801 1.253 1.38.316.58.473 1.302.473 2.166V19h-2.966v-1.798h-.102c-.278.55-.732 1.032-1.36 1.444-.627.412-1.455.618-2.484.618zm.801-2.267c.932 0 1.67-.267 2.216-.801.546-.534.818-1.165.818-1.892v-1.543c-.13.108-.37.203-.72.286-.35.082-.72.152-1.112.209l-.997.145c-.688.096-1.261.285-1.722.566-.46.282-.69.718-.69 1.309 0 .568.207.997.622 1.287.415.29.943.434 1.585.434zm7.77 2.003V5.91h2.992v2.18h.136c.239-.76.65-1.346 1.232-1.755.582-.409 1.249-.613 1.999-.613.17 0 .362.007.575.02.213.015.39.036.532.065v2.838a3.396 3.396 0 0 0-.617-.124 6.254 6.254 0 0 0-.814-.055c-.847 0-1.55.266-2.11.797-.56.531-.84 1.211-.84 2.041V19h-3.084zm8.069 0V5.91h3.085V19h-3.085zm1.551-14.949c-.494 0-.916-.163-1.265-.49a1.558 1.558 0 0 1-.525-1.18c0-.466.175-.863.525-1.19.349-.326.77-.49 1.265-.49.489 0 .908.164 1.257.49.35.327.524.724.524 1.19 0 .46-.174.853-.524 1.18-.35.327-.768.49-1.257.49z" fill="#96C3ED"/></g></svg>';

    /* src/popup/App.svelte generated by Svelte v3.29.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (234:0) {#if error}
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let iconbutton;
    	let current;

    	iconbutton = new IconButton({
    			props: { icon: iconClear, title: "Clear error" }
    		});

    	iconbutton.$on("click", /*click_handler_1*/ ctx[15]);

    	return {
    		c() {
    			div = element("div");
    			t0 = text(/*error*/ ctx[0]);
    			t1 = space();
    			create_component(iconbutton.$$.fragment);
    			attr(div, "class", "error svelte-9jwptc");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			mount_component(iconbutton, div, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty & /*error*/ 1) set_data(t0, /*error*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(iconbutton.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(iconbutton);
    		}
    	};
    }

    // (250:8) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*list*/ ctx[9];
    	const get_key = ctx => /*item*/ ctx[19].filename;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "items svelte-9jwptc");
    			toggle_class(div, "disabled", /*disabled*/ ctx[3]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*list, toggleItem*/ 4608) {
    				const each_value = /*list*/ ctx[9];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
    				check_outros();
    			}

    			if (dirty & /*disabled*/ 8) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[3]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    // (248:8) {#if items.length < 1}
    function create_if_block_2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "No matched userscripts";
    			attr(div, "class", "none svelte-9jwptc");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (245:4) {#if loading}
    function create_if_block_1$1(ctx) {
    	let loader;
    	let current;
    	loader = new Loader({});

    	return {
    		c() {
    			create_component(loader.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};
    }

    // (252:16) {#each list as item (item.filename)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let popupitem;
    	let current;

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[16](/*item*/ ctx[19], ...args);
    	}

    	popupitem = new PopupItem({
    			props: {
    				enabled: !/*item*/ ctx[19].disabled,
    				name: /*item*/ ctx[19].metadata.name[0],
    				subframe: /*item*/ ctx[19].subframe,
    				type: /*item*/ ctx[19].type
    			}
    		});

    	popupitem.$on("click", click_handler_2);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			create_component(popupitem.$$.fragment);
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(popupitem, target, anchor);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const popupitem_changes = {};
    			if (dirty & /*list*/ 512) popupitem_changes.enabled = !/*item*/ ctx[19].disabled;
    			if (dirty & /*list*/ 512) popupitem_changes.name = /*item*/ ctx[19].metadata.name[0];
    			if (dirty & /*list*/ 512) popupitem_changes.subframe = /*item*/ ctx[19].subframe;
    			if (dirty & /*list*/ 512) popupitem_changes.type = /*item*/ ctx[19].type;
    			popupitem.$set(popupitem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(popupitem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(popupitem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			destroy_component(popupitem, detaching);
    		}
    	};
    }

    // (268:0) {#if showUpdates}
    function create_if_block$3(ctx) {
    	let updateview;
    	let current;

    	updateview = new UpdateView({
    			props: {
    				closeClick: /*func*/ ctx[18],
    				updateClick: /*updateAll*/ ctx[11],
    				checkClick: /*checkForUpdates*/ ctx[13],
    				loading: /*disabled*/ ctx[3],
    				updates: /*updates*/ ctx[6]
    			}
    		});

    	return {
    		c() {
    			create_component(updateview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(updateview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const updateview_changes = {};
    			if (dirty & /*showUpdates*/ 32) updateview_changes.closeClick = /*func*/ ctx[18];
    			if (dirty & /*disabled*/ 8) updateview_changes.loading = /*disabled*/ ctx[3];
    			if (dirty & /*updates*/ 64) updateview_changes.updates = /*updates*/ ctx[6];
    			updateview.$set(updateview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(updateview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(updateview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(updateview, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let iconbutton0;
    	let t1;
    	let iconbutton1;
    	let t2;
    	let iconbutton2;
    	let t3;
    	let t4;
    	let div2;
    	let current_block_type_index;
    	let if_block1;
    	let div2_class_value;
    	let t5;
    	let div4;
    	let div3;
    	let t7;
    	let if_block2_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	iconbutton0 = new IconButton({
    			props: {
    				icon: iconOpen,
    				title: "Open save location",
    				disabled: /*disabled*/ ctx[3]
    			}
    		});

    	iconbutton0.$on("click", openSaveLocation);

    	iconbutton1 = new IconButton({
    			props: {
    				icon: iconUpdate,
    				notification: /*updates*/ ctx[6].length,
    				title: "Show updates",
    				disabled: /*disabled*/ ctx[3]
    			}
    		});

    	iconbutton1.$on("click", /*click_handler*/ ctx[14]);

    	iconbutton2 = new IconButton({
    			props: {
    				icon: iconPower,
    				title: "Toggle injection",
    				color: /*active*/ ctx[1]
    				? "var(--color-green)"
    				: "var(--color-red)",
    				disabled: /*disabled*/ ctx[3]
    			}
    		});

    	iconbutton2.$on("click", /*toggleExtension*/ ctx[10]);
    	let if_block0 = /*error*/ ctx[0] && create_if_block_3(ctx);
    	const if_block_creators = [create_if_block_1$1, create_if_block_2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[2]) return 0;
    		if (/*items*/ ctx[4].length < 1) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block2 = /*showUpdates*/ ctx[5] && create_if_block$3(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			create_component(iconbutton0.$$.fragment);
    			t1 = space();
    			create_component(iconbutton1.$$.fragment);
    			t2 = space();
    			create_component(iconbutton2.$$.fragment);
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div2 = element("div");
    			if_block1.c();
    			t5 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "Open Extension Page";
    			t7 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(div0, "class", "header__logo svelte-9jwptc");
    			attr(div1, "class", "header svelte-9jwptc");
    			attr(div2, "class", div2_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-9jwptc");
    			attr(div3, "class", "link");
    			attr(div4, "class", "footer svelte-9jwptc");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			div0.innerHTML = logo;
    			append(div1, t0);
    			mount_component(iconbutton0, div1, null);
    			append(div1, t1);
    			mount_component(iconbutton1, div1, null);
    			append(div1, t2);
    			mount_component(iconbutton2, div1, null);
    			insert(target, t3, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t4, anchor);
    			insert(target, div2, anchor);
    			if_blocks[current_block_type_index].m(div2, null);
    			/*div2_binding*/ ctx[17](div2);
    			insert(target, t5, anchor);
    			insert(target, div4, anchor);
    			append(div4, div3);
    			insert(target, t7, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div3, "click", openExtensionPage);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const iconbutton0_changes = {};
    			if (dirty & /*disabled*/ 8) iconbutton0_changes.disabled = /*disabled*/ ctx[3];
    			iconbutton0.$set(iconbutton0_changes);
    			const iconbutton1_changes = {};
    			if (dirty & /*updates*/ 64) iconbutton1_changes.notification = /*updates*/ ctx[6].length;
    			if (dirty & /*disabled*/ 8) iconbutton1_changes.disabled = /*disabled*/ ctx[3];
    			iconbutton1.$set(iconbutton1_changes);
    			const iconbutton2_changes = {};

    			if (dirty & /*active*/ 2) iconbutton2_changes.color = /*active*/ ctx[1]
    			? "var(--color-green)"
    			: "var(--color-red)";

    			if (dirty & /*disabled*/ 8) iconbutton2_changes.disabled = /*disabled*/ ctx[3];
    			iconbutton2.$set(iconbutton2_changes);

    			if (/*error*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*error*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t4.parentNode, t4);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div2, null);
    			}

    			if (!current || dirty & /*rowColors*/ 256 && div2_class_value !== (div2_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-9jwptc")) {
    				attr(div2, "class", div2_class_value);
    			}

    			if (/*showUpdates*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*showUpdates*/ 32) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(iconbutton0.$$.fragment, local);
    			transition_in(iconbutton1.$$.fragment, local);
    			transition_in(iconbutton2.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton0.$$.fragment, local);
    			transition_out(iconbutton1.$$.fragment, local);
    			transition_out(iconbutton2.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(iconbutton0);
    			destroy_component(iconbutton1);
    			destroy_component(iconbutton2);
    			if (detaching) detach(t3);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t4);
    			if (detaching) detach(div2);
    			if_blocks[current_block_type_index].d();
    			/*div2_binding*/ ctx[17](null);
    			if (detaching) detach(t5);
    			if (detaching) detach(div4);
    			if (detaching) detach(t7);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    async function openExtensionPage() {
    	const url = browser.runtime.getURL("page.html");
    	const tabs = await browser.tabs.query({});

    	for (let i = 0; i < tabs.length; i++) {
    		if (tabs[i].url === url) {
    			await browser.windows.update(tabs[i].windowId, { focused: true });
    			await browser.tabs.update(tabs[i].id, { active: true });
    			window.close();
    			return;
    		}
    	}

    	browser.tabs.create({ url });
    }

    function openSaveLocation() {
    	browser.runtime.sendNativeMessage({ name: "OPEN_SAVE_LOCATION" });
    	window.close();
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let error = undefined;
    	let active = true;
    	let loading = true;
    	let disabled = true;
    	let items = [];
    	let showUpdates = false;
    	let updates = [];
    	let main;
    	let rowColors;

    	function toggleExtension() {
    		$$invalidate(3, disabled = true);

    		browser.runtime.sendNativeMessage({ name: "POPUP_TOGGLE_EXTENSION" }, response => {
    			$$invalidate(3, disabled = false);
    			if (response.error) return $$invalidate(0, error = response.error);
    			$$invalidate(1, active = !active);
    		});
    	}

    	function updateAll() {
    		$$invalidate(5, showUpdates = false);
    		$$invalidate(3, disabled = true);
    		$$invalidate(2, loading = true);
    		$$invalidate(7, main.style.height = main.offsetHeight + "px", main);

    		browser.runtime.sendNativeMessage({ name: "POPUP_UPDATE_ALL" }, response => {
    			if (response.error) {
    				$$invalidate(0, error = response.error);
    			} else {
    				if (response.items) $$invalidate(4, items = response.items);
    				$$invalidate(6, updates = response.updates);
    			}

    			main.removeAttribute("style");
    			$$invalidate(3, disabled = false);
    			$$invalidate(2, loading = false);
    		});
    	}

    	function toggleItem(item) {
    		$$invalidate(3, disabled = true);

    		browser.runtime.sendNativeMessage({ name: "TOGGLE_ITEM", item }, response => {
    			if (response.error) {
    				$$invalidate(0, error = "Failed to toggle item");
    			} else {
    				const i = items.findIndex(el => el === item);
    				item.disabled = !item.disabled;
    				$$invalidate(4, items[i] = item, items);
    			}

    			$$invalidate(3, disabled = false);
    		});
    	}

    	function checkForUpdates() {
    		$$invalidate(3, disabled = true);
    		setTimeout(() => $$invalidate(3, disabled = false), 1000);
    	}

    	onMount(async () => {
    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    		const url = tabs[0].url;
    		const frameUrls = [];

    		if (url) {
    			const frames = await browser.webNavigation.getAllFrames({ tabId: tabs[0].id });
    			frames.forEach(frame => frameUrls.push(frame.url));
    		}

    		const message = { name: "POPUP_MATCHES", url, frameUrls };
    		const response = await browser.runtime.sendNativeMessage(message);

    		if (response.error) {
    			$$invalidate(0, error = response.error);
    		} else {
    			$$invalidate(1, active = response.active === "true" ? true : false);
    			$$invalidate(4, items = response.items);
    			$$invalidate(6, updates = response.updates);
    		}

    		$$invalidate(2, loading = false);
    		$$invalidate(3, disabled = false);
    	});

    	const click_handler = () => $$invalidate(5, showUpdates = true);
    	const click_handler_1 = () => $$invalidate(0, error = undefined);
    	const click_handler_2 = item => toggleItem(item);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			main = $$value;
    			$$invalidate(7, main);
    		});
    	}

    	const func = () => $$invalidate(5, showUpdates = false);
    	let list;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items*/ 16) {
    			 $$invalidate(9, list = items.sort((a, b) => a.metadata.name[0].localeCompare(b.metadata.name[0])));
    		}

    		if ($$self.$$.dirty & /*list*/ 512) {
    			 if (list.length > 1 && list.length % 2 === 0) {
    				$$invalidate(8, rowColors = "even");
    			} else if (list.length > 1 && list.length % 2 != 0) {
    				$$invalidate(8, rowColors = "odd");
    			} else {
    				$$invalidate(8, rowColors = undefined);
    			}
    		}
    	};

    	return [
    		error,
    		active,
    		loading,
    		disabled,
    		items,
    		showUpdates,
    		updates,
    		main,
    		rowColors,
    		list,
    		toggleExtension,
    		updateAll,
    		toggleItem,
    		checkForUpdates,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		div2_binding,
    		func
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.getElementById("app"),
        props: {}
    });

}());