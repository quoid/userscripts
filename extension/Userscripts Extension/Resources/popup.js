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
    			attr(div, "class", "svelte-tibcgr");
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
    			attr(div, "class", "loader svelte-tibcgr");
    			set_style(div, "background-color", /*backgroundColor*/ ctx[2]);
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

    			if (!current || dirty & /*backgroundColor*/ 4) {
    				set_style(div, "background-color", /*backgroundColor*/ ctx[2]);
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

    	let { backgroundColor = "var(--color-bg-secondary)" } = $$props;

    	$$self.$$set = $$props => {
    		if ("abort" in $$props) $$invalidate(0, abort = $$props.abort);
    		if ("abortClick" in $$props) $$invalidate(1, abortClick = $$props.abortClick);
    		if ("backgroundColor" in $$props) $$invalidate(2, backgroundColor = $$props.backgroundColor);
    	};

    	return [abort, abortClick, backgroundColor];
    }

    class Loader extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			abort: 0,
    			abortClick: 1,
    			backgroundColor: 2
    		});
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
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (140:12) {:else}
    function create_else_block(ctx) {
    	let div2;
    	let html_tag;
    	let t0;
    	let div1;
    	let t1;
    	let br;
    	let t2;
    	let div0;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text("There are no file updates available\n                        ");
    			br = element("br");
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "Check Again";
    			html_tag = new HtmlTag(t0);
    			attr(div0, "class", "link svelte-vy30nd");
    			attr(div1, "class", "svelte-vy30nd");
    			attr(div2, "class", "none svelte-vy30nd");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			html_tag.m(iconUpdate, div2);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, t1);
    			append(div1, br);
    			append(div1, t2);
    			append(div1, div0);

    			if (!mounted) {
    				dispose = listen(div0, "click", function () {
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
    			if (detaching) detach(div2);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (124:12) {#if updates.length}
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
    	const get_key = ctx => /*item*/ ctx[8].name;

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
    			attr(p, "class", "svelte-vy30nd");
    			attr(div, "class", "link svelte-vy30nd");
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

    			if (dirty & /*updateSingleClick, updates*/ 34) {
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

    // (121:8) {#if loading}
    function create_if_block$2(ctx) {
    	let loader;
    	let current;

    	loader = new Loader({
    			props: {
    				backgroundColor: "var(--color-bg-primary)"
    			}
    		});

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

    // (125:16) {#each updates as item (item.name)}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*item*/ ctx[8].name + "";
    	let t0;
    	let t1;
    	let a;
    	let t2;
    	let a_href_value;
    	let t3;
    	let span;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[7](/*item*/ ctx[8], ...args);
    	}

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
    			t3 = space();
    			span = element("span");
    			span.textContent = "Update";
    			attr(div0, "class", "truncate svelte-vy30nd");
    			attr(a, "href", a_href_value = /*item*/ ctx[8].url);
    			attr(a, "target", "_blank");
    			attr(a, "class", "svelte-vy30nd");
    			attr(span, "class", "link svelte-vy30nd");
    			attr(div1, "class", "item svelte-vy30nd");
    			this.first = div1;
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);
    			append(div1, a);
    			append(a, t2);
    			append(div1, t3);
    			append(div1, span);

    			if (!mounted) {
    				dispose = listen(span, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*updates*/ 2 && t0_value !== (t0_value = /*item*/ ctx[8].name + "")) set_data(t0, t0_value);

    			if (dirty & /*updates*/ 2 && a_href_value !== (a_href_value = /*item*/ ctx[8].url)) {
    				attr(a, "href", a_href_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
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
    			attr(div0, "class", "view__header svelte-vy30nd");
    			attr(div1, "class", "view__body svelte-vy30nd");
    			attr(div2, "class", "view view--updates svelte-vy30nd");
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
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[6], {}, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton.$$.fragment, local);
    			transition_out(if_block);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[6], {}, false);
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
    	let { updateSingleClick } = $$props;

    	function slide(node, params) {
    		return {
    			delay: params.delay || 0,
    			duration: params.duration || 150,
    			easing: params.easing || quintInOut,
    			css: t => `transform: translateX(${(t - 1) * 18}rem);`
    		};
    	}

    	const click_handler = item => updateSingleClick(item);

    	$$self.$$set = $$props => {
    		if ("loading" in $$props) $$invalidate(0, loading = $$props.loading);
    		if ("updates" in $$props) $$invalidate(1, updates = $$props.updates);
    		if ("closeClick" in $$props) $$invalidate(2, closeClick = $$props.closeClick);
    		if ("updateClick" in $$props) $$invalidate(3, updateClick = $$props.updateClick);
    		if ("checkClick" in $$props) $$invalidate(4, checkClick = $$props.checkClick);
    		if ("updateSingleClick" in $$props) $$invalidate(5, updateSingleClick = $$props.updateSingleClick);
    	};

    	return [
    		loading,
    		updates,
    		closeClick,
    		updateClick,
    		checkClick,
    		updateSingleClick,
    		slide,
    		click_handler
    	];
    }

    class UpdateView extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			loading: 0,
    			updates: 1,
    			closeClick: 2,
    			updateClick: 3,
    			checkClick: 4,
    			updateSingleClick: 5
    		});
    	}
    }

    var iconPower = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13.333 0h-2.666v13.333h2.666V0zm6.44 2.893L17.88 4.787A9.227 9.227 0 0121.333 12 9.327 9.327 0 0112 21.333 9.327 9.327 0 012.667 12c0-2.92 1.346-5.52 3.44-7.227l-1.88-1.88C1.64 5.093 0 8.347 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-3.653-1.64-6.907-4.227-9.107z" fill-rule="nonzero"/></svg>';

    var iconOpen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20"><path d="M21.6 2.875H12L9.6.5H2.4A2.384 2.384 0 00.012 2.875L0 17.125C0 18.431 1.08 19.5 2.4 19.5h19.2c1.32 0 2.4-1.069 2.4-2.375V5.25c0-1.306-1.08-2.375-2.4-2.375zm0 14.25H2.4V5.25h19.2v11.875z" fill-rule="nonzero"/></svg>';

    var iconClear = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm4.9 6L12 10.9 7.1 6 6 7.1l4.9 4.9L6 16.9 7.1 18l4.9-4.9 4.9 4.9 1.1-1.1-4.9-4.9L18 7.1 16.9 6z" fill-rule="evenodd"/></svg>';

    /* src/popup/App.svelte generated by Svelte v3.29.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (265:0) {#if error}
    function create_if_block_5(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let iconbutton;
    	let current;

    	iconbutton = new IconButton({
    			props: { icon: iconClear, title: "Clear error" }
    		});

    	iconbutton.$on("click", /*click_handler_1*/ ctx[18]);

    	return {
    		c() {
    			div = element("div");
    			t0 = text(/*error*/ ctx[0]);
    			t1 = space();
    			create_component(iconbutton.$$.fragment);
    			attr(div, "class", "error svelte-d7jal9");
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

    // (283:8) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*list*/ ctx[11];
    	const get_key = ctx => /*item*/ ctx[22].filename;

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

    			attr(div, "class", "items svelte-d7jal9");
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
    			if (dirty & /*list, toggleItem*/ 34816) {
    				const each_value = /*list*/ ctx[11];
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

    // (281:35) 
    function create_if_block_4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "No matched userscripts";
    			attr(div, "class", "none svelte-d7jal9");
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

    // (279:8) {#if inactive}
    function create_if_block_3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Popup inactive on extension page";
    			attr(div, "class", "none svelte-d7jal9");
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

    // (276:4) {#if loading}
    function create_if_block_2(ctx) {
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

    // (285:16) {#each list as item (item.filename)}
    function create_each_block$1(key_1, ctx) {
    	let first;
    	let popupitem;
    	let current;

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[19](/*item*/ ctx[22], ...args);
    	}

    	popupitem = new PopupItem({
    			props: {
    				enabled: !/*item*/ ctx[22].disabled,
    				name: /*item*/ ctx[22].name,
    				subframe: /*item*/ ctx[22].subframe,
    				type: /*item*/ ctx[22].type
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
    			if (dirty & /*list*/ 2048) popupitem_changes.enabled = !/*item*/ ctx[22].disabled;
    			if (dirty & /*list*/ 2048) popupitem_changes.name = /*item*/ ctx[22].name;
    			if (dirty & /*list*/ 2048) popupitem_changes.subframe = /*item*/ ctx[22].subframe;
    			if (dirty & /*list*/ 2048) popupitem_changes.type = /*item*/ ctx[22].type;
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

    // (298:0) {#if !inactive && platform === "macos"}
    function create_if_block_1$1(ctx) {
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Open Extension Page";
    			attr(div0, "class", "link");
    			attr(div1, "class", "footer svelte-d7jal9");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			if (!mounted) {
    				dispose = listen(div0, "click", openExtensionPage);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (303:0) {#if showUpdates}
    function create_if_block$3(ctx) {
    	let updateview;
    	let current;

    	updateview = new UpdateView({
    			props: {
    				closeClick: /*func*/ ctx[21],
    				updateClick: /*updateAll*/ ctx[13],
    				checkClick: /*checkForUpdates*/ ctx[16],
    				loading: /*disabled*/ ctx[3],
    				updates: /*updates*/ ctx[6],
    				updateSingleClick: /*updateItem*/ ctx[14]
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
    			if (dirty & /*showUpdates*/ 32) updateview_changes.closeClick = /*func*/ ctx[21];
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
    	let div0;
    	let iconbutton0;
    	let t0;
    	let iconbutton1;
    	let t1;
    	let iconbutton2;
    	let t2;
    	let t3;
    	let div1;
    	let current_block_type_index;
    	let if_block1;
    	let div1_class_value;
    	let t4;
    	let t5;
    	let if_block3_anchor;
    	let current;

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

    	iconbutton1.$on("click", /*click_handler*/ ctx[17]);

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

    	iconbutton2.$on("click", /*toggleExtension*/ ctx[12]);
    	let if_block0 = /*error*/ ctx[0] && create_if_block_5(ctx);
    	const if_block_creators = [create_if_block_2, create_if_block_3, create_if_block_4, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[2]) return 0;
    		if (/*inactive*/ ctx[9]) return 1;
    		if (/*items*/ ctx[4].length < 1) return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block2 = !/*inactive*/ ctx[9] && /*platform*/ ctx[10] === "macos" && create_if_block_1$1();
    	let if_block3 = /*showUpdates*/ ctx[5] && create_if_block$3(ctx);

    	return {
    		c() {
    			div0 = element("div");
    			create_component(iconbutton0.$$.fragment);
    			t0 = space();
    			create_component(iconbutton1.$$.fragment);
    			t1 = space();
    			create_component(iconbutton2.$$.fragment);
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			div1 = element("div");
    			if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			if (if_block3) if_block3.c();
    			if_block3_anchor = empty();
    			attr(div0, "class", "header svelte-d7jal9");
    			attr(div1, "class", div1_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-d7jal9");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			mount_component(iconbutton0, div0, null);
    			append(div0, t0);
    			mount_component(iconbutton1, div0, null);
    			append(div0, t1);
    			mount_component(iconbutton2, div0, null);
    			insert(target, t2, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t3, anchor);
    			insert(target, div1, anchor);
    			if_blocks[current_block_type_index].m(div1, null);
    			/*div1_binding*/ ctx[20](div1);
    			insert(target, t4, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t5, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, if_block3_anchor, anchor);
    			current = true;
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
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t3.parentNode, t3);
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
    				if_block1.m(div1, null);
    			}

    			if (!current || dirty & /*rowColors*/ 256 && div1_class_value !== (div1_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-d7jal9")) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (!/*inactive*/ ctx[9] && /*platform*/ ctx[10] === "macos") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$1();
    					if_block2.c();
    					if_block2.m(t5.parentNode, t5);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*showUpdates*/ ctx[5]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*showUpdates*/ 32) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$3(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
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
    			transition_in(if_block3);
    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton0.$$.fragment, local);
    			transition_out(iconbutton1.$$.fragment, local);
    			transition_out(iconbutton2.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block3);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			destroy_component(iconbutton0);
    			destroy_component(iconbutton1);
    			destroy_component(iconbutton2);
    			if (detaching) detach(t2);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t3);
    			if (detaching) detach(div1);
    			if_blocks[current_block_type_index].d();
    			/*div1_binding*/ ctx[20](null);
    			if (detaching) detach(t4);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t5);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(if_block3_anchor);
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

    	await browser.tabs.create({ url });
    }

    async function openSaveLocation() {
    	await browser.runtime.sendNativeMessage({ name: "OPEN_SAVE_LOCATION" });
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
    	let inactive = false;
    	let platform;

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

    	async function updateItem(item) {
    		$$invalidate(3, disabled = true);
    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    		const url = tabs[0].url;
    		const frameUrls = [];

    		if (url) {
    			const frames = await browser.webNavigation.getAllFrames({ tabId: tabs[0].id });
    			frames.forEach(frame => frameUrls.push(frame.url));
    		}

    		const message = {
    			name: "POPUP_UPDATE_SINGLE",
    			filename: item.filename,
    			url,
    			frameUrls
    		};

    		const response = await browser.runtime.sendNativeMessage(message);

    		if (response.error) {
    			$$invalidate(0, error = response.error);
    			$$invalidate(5, showUpdates = false);
    		} else {
    			console.log(response);
    			$$invalidate(6, updates = updates.filter(e => e.filename != item.filename));
    			$$invalidate(4, items = response.items);
    		}

    		$$invalidate(3, disabled = false);
    	}

    	function toggleItem(item) {
    		$$invalidate(3, disabled = true);

    		browser.runtime.sendNativeMessage({ name: "TOGGLE_ITEM", item }, response => {
    			if (response.error) {
    				$$invalidate(0, error = response.error);
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

    		browser.runtime.sendNativeMessage({ name: "POPUP_CHECK_UPDATES" }, response => {
    			if (response.error) {
    				$$invalidate(0, error = response.error);
    				$$invalidate(5, showUpdates = false);
    			} else {
    				$$invalidate(6, updates = response.updates);
    			}

    			$$invalidate(3, disabled = false);
    		});
    	}

    	onMount(async () => {
    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    		const url = tabs[0].url;
    		const frameUrls = [];
    		const extensionPageUrl = browser.runtime.getURL("page.html");

    		if (url === extensionPageUrl) {
    			// disable popup on extension page
    			$$invalidate(9, inactive = true);

    			$$invalidate(2, loading = false);
    			return;
    		}

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
    			$$invalidate(10, platform = response.platform);
    			$$invalidate(6, updates = response.updates);
    		}

    		$$invalidate(2, loading = false);
    		$$invalidate(3, disabled = false);
    	});

    	const click_handler = () => $$invalidate(5, showUpdates = true);
    	const click_handler_1 = () => $$invalidate(0, error = undefined);
    	const click_handler_2 = item => toggleItem(item);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			main = $$value;
    			$$invalidate(7, main);
    		});
    	}

    	const func = () => $$invalidate(5, showUpdates = false);
    	let list;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items*/ 16) {
    			 $$invalidate(11, list = items.sort((a, b) => a.name.localeCompare(b.name)));
    		}

    		if ($$self.$$.dirty & /*list*/ 2048) {
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
    		inactive,
    		platform,
    		list,
    		toggleExtension,
    		updateAll,
    		updateItem,
    		toggleItem,
    		checkForUpdates,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		div1_binding,
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