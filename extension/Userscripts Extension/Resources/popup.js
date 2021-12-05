(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

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
    			attr(button, "class", "svelte-2umijw");
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

    /* src/shared/Components/Toggle.svelte generated by Svelte v3.29.0 */

    function create_fragment$1(ctx) {
    	let label;
    	let input;
    	let t;
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t = space();
    			span = element("span");
    			attr(input, "type", "checkbox");
    			input.disabled = /*disabled*/ ctx[1];
    			attr(input, "class", "svelte-1dd8fli");
    			attr(span, "class", "svelte-1dd8fli");
    			attr(label, "title", /*title*/ ctx[2]);
    			attr(label, "class", "svelte-1dd8fli");
    			toggle_class(label, "disabled", /*disabled*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			input.checked = /*checked*/ ctx[0];
    			append(label, t);
    			append(label, span);

    			if (!mounted) {
    				dispose = [
    					listen(input, "click", stop_propagation(/*click_handler*/ ctx[3])),
    					listen(input, "change", /*input_change_handler*/ ctx[4]),
    					listen(label, "click", stop_propagation(click_handler_1))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*disabled*/ 2) {
    				input.disabled = /*disabled*/ ctx[1];
    			}

    			if (dirty & /*checked*/ 1) {
    				input.checked = /*checked*/ ctx[0];
    			}

    			if (dirty & /*title*/ 4) {
    				attr(label, "title", /*title*/ ctx[2]);
    			}

    			if (dirty & /*disabled*/ 2) {
    				toggle_class(label, "disabled", /*disabled*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(label);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const click_handler_1 = () => {
    	
    };

    function instance$1($$self, $$props, $$invalidate) {
    	let { checked = false } = $$props;
    	let { disabled = false } = $$props;
    	let { title = undefined } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function input_change_handler() {
    		checked = this.checked;
    		$$invalidate(0, checked);
    	}

    	$$self.$$set = $$props => {
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("title" in $$props) $$invalidate(2, title = $$props.title);
    	};

    	return [checked, disabled, title, click_handler, input_change_handler];
    }

    class Toggle extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { checked: 0, disabled: 1, title: 2 });
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

    function create_fragment$2(ctx) {
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

    function instance$2($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			abort: 0,
    			abortClick: 1,
    			backgroundColor: 2
    		});
    	}
    }

    /* src/shared/Components/Tag.svelte generated by Svelte v3.29.0 */

    function create_fragment$3(ctx) {
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { type = undefined } = $$props;

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(0, type = $$props.type);
    	};

    	return [type];
    }

    class Tag extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { type: 0 });
    	}
    }

    /* src/popup/Components/PopupItem.svelte generated by Svelte v3.29.0 */

    function create_if_block$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "SUB";
    			attr(div, "class", "subframe svelte-1lgjchf");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$4(ctx) {
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
    			attr(span, "class", "svelte-1lgjchf");
    			attr(div0, "class", "truncate svelte-1lgjchf");
    			attr(div1, "class", div1_class_value = "item " + (/*enabled*/ ctx[0] ? "enabled" : "disabled") + " svelte-1lgjchf");
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

    			if (!current || dirty & /*enabled*/ 1 && div1_class_value !== (div1_class_value = "item " + (/*enabled*/ ctx[0] ? "enabled" : "disabled") + " svelte-1lgjchf")) {
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

    function instance$4($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			enabled: 0,
    			name: 1,
    			type: 2,
    			subframe: 3
    		});
    	}
    }

    var iconArrowLeft = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 18"><path d="M8.4 17.5l1.692-1.712-5.496-5.574H24V7.786H4.596l5.508-5.574L8.4.5 0 9z" fill-rule="nonzero"/></svg>';

    /* src/popup/Components/View.svelte generated by Svelte v3.29.0 */

    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
    	const default_slot_or_fallback = default_slot || fallback_block();

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (30:8) {#if loading}
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

    // (33:18) <div>
    function fallback_block(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Slot content is required...";
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let iconbutton;
    	let t2;
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

    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(/*headerTitle*/ ctx[1]);
    			t1 = space();
    			create_component(iconbutton.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			if_block.c();
    			attr(div0, "class", "view__header svelte-nvapi9");
    			attr(div1, "class", "view__body svelte-nvapi9");
    			attr(div2, "class", "view svelte-nvapi9");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, t0);
    			append(div0, t1);
    			mount_component(iconbutton, div0, null);
    			append(div2, t2);
    			append(div2, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (!current || dirty & /*headerTitle*/ 2) set_data(t0, /*headerTitle*/ ctx[1]);
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
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[3], {}, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton.$$.fragment, local);
    			transition_out(if_block);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, /*slide*/ ctx[3], {}, false);
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

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { loading = false } = $$props;
    	let { headerTitle = "View Header" } = $$props;
    	let { closeClick } = $$props;

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
    		if ("headerTitle" in $$props) $$invalidate(1, headerTitle = $$props.headerTitle);
    		if ("closeClick" in $$props) $$invalidate(2, closeClick = $$props.closeClick);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [loading, headerTitle, closeClick, slide, $$scope, slots];
    }

    class View extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			loading: 0,
    			headerTitle: 1,
    			closeClick: 2
    		});
    	}
    }

    var iconUpdate = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16"><path d="M19.35 6.04A7.49 7.49 0 0012 0C9.11 0 6.6 1.64 5.35 4.04A5.994 5.994 0 000 10c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 14H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0112 2c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0122 11c0 1.65-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55V6z" fill-rule="nonzero"/></svg>';

    /* src/popup/Components/UpdateView.svelte generated by Svelte v3.29.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (25:0) {:else}
    function create_else_block$1(ctx) {
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
    			t1 = text("There are no file updates available\n            ");
    			br = element("br");
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "Check Again";
    			html_tag = new HtmlTag(t0);
    			attr(div0, "class", "link svelte-1v987ms");
    			attr(div1, "class", "svelte-1v987ms");
    			attr(div2, "class", "none svelte-1v987ms");
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
    					if (is_function(/*checkClick*/ ctx[2])) /*checkClick*/ ctx[2].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (9:0) {#if updates.length}
    function create_if_block$3(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let p;
    	let t2;
    	let div;
    	let mounted;
    	let dispose;
    	let each_value = /*updates*/ ctx[0];
    	const get_key = ctx => /*item*/ ctx[5].name;

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
    			p.textContent = "Be sure you trust the author before saving remote code to your device.";
    			t2 = space();
    			div = element("div");
    			div.textContent = "Update All";
    			attr(p, "class", "svelte-1v987ms");
    			attr(div, "class", "link svelte-1v987ms");
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
    					if (is_function(/*updateClick*/ ctx[1])) /*updateClick*/ ctx[1].apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*updateSingleClick, updates*/ 9) {
    				const each_value = /*updates*/ ctx[0];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, t0.parentNode, destroy_block, create_each_block, t0, get_each_context);
    			}
    		},
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

    // (10:4) {#each updates as item (item.name)}
    function create_each_block(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*item*/ ctx[5].name + "";
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
    		return /*click_handler*/ ctx[4](/*item*/ ctx[5], ...args);
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
    			attr(div0, "class", "truncate svelte-1v987ms");
    			attr(a, "href", a_href_value = /*item*/ ctx[5].url);
    			attr(a, "target", "_blank");
    			attr(a, "class", "svelte-1v987ms");
    			attr(span, "class", "link svelte-1v987ms");
    			attr(div1, "class", "item svelte-1v987ms");
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
    			if (dirty & /*updates*/ 1 && t0_value !== (t0_value = /*item*/ ctx[5].name + "")) set_data(t0, t0_value);

    			if (dirty & /*updates*/ 1 && a_href_value !== (a_href_value = /*item*/ ctx[5].url)) {
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

    function create_fragment$6(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*updates*/ ctx[0].length) return create_if_block$3;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { updates = [] } = $$props;
    	let { updateClick } = $$props;
    	let { checkClick } = $$props;
    	let { updateSingleClick } = $$props;
    	const click_handler = item => updateSingleClick(item);

    	$$self.$$set = $$props => {
    		if ("updates" in $$props) $$invalidate(0, updates = $$props.updates);
    		if ("updateClick" in $$props) $$invalidate(1, updateClick = $$props.updateClick);
    		if ("checkClick" in $$props) $$invalidate(2, checkClick = $$props.checkClick);
    		if ("updateSingleClick" in $$props) $$invalidate(3, updateSingleClick = $$props.updateSingleClick);
    	};

    	return [updates, updateClick, checkClick, updateSingleClick, click_handler];
    }

    class UpdateView extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			updates: 0,
    			updateClick: 1,
    			checkClick: 2,
    			updateSingleClick: 3
    		});
    	}
    }

    var iconWarn = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 22"><path d="M12 4.91l8.215 14.38H3.785L12 4.91M12 .5l-12 21h24L12 .5zm1.09 15.474h-2.18v2.21h2.18v-2.21zm0-6.632h-2.18v4.421h2.18v-4.42z"/></svg>';

    var iconError = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10.8 15.6h2.4V18h-2.4v-2.4zm0-9.6h2.4v7.2h-2.4V6zm1.188-6C5.364 0 0 5.376 0 12s5.364 12 11.988 12C18.624 24 24 18.624 24 12S18.624 0 11.988 0zM12 21.6A9.597 9.597 0 012.4 12c0-5.304 4.296-9.6 9.6-9.6 5.304 0 9.6 4.296 9.6 9.6 0 5.304-4.296 9.6-9.6 9.6z"/></svg>';

    /* src/popup/Components/InstallView.svelte generated by Svelte v3.29.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (47:27) 
    function create_if_block_4(ctx) {
    	let div1;
    	let html_tag;
    	let t0;
    	let div0;
    	let t2;
    	let p;
    	let t3;
    	let t4;

    	return {
    		c() {
    			div1 = element("div");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "The usercript can not be installed.";
    			t2 = space();
    			p = element("p");
    			t3 = text("Error: ");
    			t4 = text(/*installError*/ ctx[1]);
    			html_tag = new HtmlTag(t0);
    			attr(p, "class", "svelte-21jyi6");
    			attr(div1, "class", "install__error svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			html_tag.m(iconError, div1);
    			append(div1, t0);
    			append(div1, div0);
    			append(div1, t2);
    			append(div1, p);
    			append(p, t3);
    			append(p, t4);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*installError*/ 2) set_data(t4, /*installError*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    // (10:4) {#if userscript}
    function create_if_block$4(ctx) {
    	let ul;
    	let li0;
    	let t0_value = /*userscript*/ ctx[0].name + "";
    	let t0;
    	let t1;
    	let li1;
    	let t2_value = /*userscript*/ ctx[0].description + "";
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let div2;
    	let div0;
    	let t7;
    	let div1;
    	let t9;
    	let div3;
    	let button0;
    	let t11;
    	let button1;
    	let mounted;
    	let dispose;
    	let if_block0 = /*userscript*/ ctx[0].match && create_if_block_3(ctx);
    	let if_block1 = /*userscript*/ ctx[0].require && create_if_block_2(ctx);
    	let if_block2 = /*userscript*/ ctx[0].grant && create_if_block_1(ctx);

    	return {
    		c() {
    			ul = element("ul");
    			li0 = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			li1 = element("li");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t7 = space();
    			div1 = element("div");
    			div1.textContent = "Be sure you trust the author before installing. Nefarious code can exploit your security and privacy.";
    			t9 = space();
    			div3 = element("div");
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t11 = space();
    			button1 = element("button");
    			button1.textContent = "Install";
    			attr(li0, "class", "svelte-21jyi6");
    			attr(li1, "class", "svelte-21jyi6");
    			attr(ul, "class", "svelte-21jyi6");
    			attr(div0, "class", "badge--icon svelte-21jyi6");
    			attr(div1, "class", "badge--text svelte-21jyi6");
    			attr(div2, "class", "badge svelte-21jyi6");
    			attr(button0, "class", "cancel svelte-21jyi6");
    			attr(button1, "class", "install svelte-21jyi6");
    			attr(div3, "class", "buttons svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);
    			append(ul, li0);
    			append(li0, t0);
    			append(ul, t1);
    			append(ul, li1);
    			append(li1, t2);
    			append(ul, t3);
    			if (if_block0) if_block0.m(ul, null);
    			append(ul, t4);
    			if (if_block1) if_block1.m(ul, null);
    			append(ul, t5);
    			if (if_block2) if_block2.m(ul, null);
    			insert(target, t6, anchor);
    			insert(target, div2, anchor);
    			append(div2, div0);
    			div0.innerHTML = iconWarn;
    			append(div2, t7);
    			append(div2, div1);
    			insert(target, t9, anchor);
    			insert(target, div3, anchor);
    			append(div3, button0);
    			append(div3, t11);
    			append(div3, button1);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", function () {
    						if (is_function(/*installCancelClick*/ ctx[2])) /*installCancelClick*/ ctx[2].apply(this, arguments);
    					}),
    					listen(button1, "click", function () {
    						if (is_function(/*installConfirmClick*/ ctx[3])) /*installConfirmClick*/ ctx[3].apply(this, arguments);
    					})
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*userscript*/ 1 && t0_value !== (t0_value = /*userscript*/ ctx[0].name + "")) set_data(t0, t0_value);
    			if (dirty & /*userscript*/ 1 && t2_value !== (t2_value = /*userscript*/ ctx[0].description + "")) set_data(t2, t2_value);

    			if (/*userscript*/ ctx[0].match) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(ul, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*userscript*/ ctx[0].require) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(ul, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*userscript*/ ctx[0].grant) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(ul, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach(t6);
    			if (detaching) detach(div2);
    			if (detaching) detach(t9);
    			if (detaching) detach(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (14:12) {#if userscript.match}
    function create_if_block_3(ctx) {
    	let li;
    	let div;
    	let t1;
    	let each_value_2 = /*userscript*/ ctx[0].match;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	return {
    		c() {
    			li = element("li");
    			div = element("div");
    			div.textContent = "@match";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "svelte-21jyi6");
    			attr(li, "class", "svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, div);
    			append(li, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(li, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1) {
    				each_value_2 = /*userscript*/ ctx[0].match;
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(li, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (17:20) {#each userscript.match as match}
    function create_each_block_2(ctx) {
    	let div;
    	let t_value = /*match*/ ctx[10] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "truncate svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1 && t_value !== (t_value = /*match*/ ctx[10] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (22:12) {#if userscript.require}
    function create_if_block_2(ctx) {
    	let li;
    	let div;
    	let t1;
    	let each_value_1 = /*userscript*/ ctx[0].require;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			li = element("li");
    			div = element("div");
    			div.textContent = "@require";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "svelte-21jyi6");
    			attr(li, "class", "svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, div);
    			append(li, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(li, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1) {
    				each_value_1 = /*userscript*/ ctx[0].require;
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(li, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (25:20) {#each userscript.require as require}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*require*/ ctx[7] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "truncate svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1 && t_value !== (t_value = /*require*/ ctx[7] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (30:12) {#if userscript.grant}
    function create_if_block_1(ctx) {
    	let li;
    	let div;
    	let t1;
    	let each_value = /*userscript*/ ctx[0].grant;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			li = element("li");
    			div = element("div");
    			div.textContent = "@grant";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "svelte-21jyi6");
    			attr(li, "class", "svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, div);
    			append(li, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(li, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1) {
    				each_value = /*userscript*/ ctx[0].grant;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(li, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (33:20) {#each userscript.grant as grant}
    function create_each_block$1(ctx) {
    	let div;
    	let t_value = /*grant*/ ctx[4] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*userscript*/ 1 && t_value !== (t_value = /*grant*/ ctx[4] + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*userscript*/ ctx[0]) return create_if_block$4;
    		if (/*installError*/ ctx[1]) return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr(div, "class", "view--install svelte-21jyi6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { userscript } = $$props;
    	let { installError } = $$props;
    	let { installCancelClick } = $$props;
    	let { installConfirmClick } = $$props;

    	$$self.$$set = $$props => {
    		if ("userscript" in $$props) $$invalidate(0, userscript = $$props.userscript);
    		if ("installError" in $$props) $$invalidate(1, installError = $$props.installError);
    		if ("installCancelClick" in $$props) $$invalidate(2, installCancelClick = $$props.installCancelClick);
    		if ("installConfirmClick" in $$props) $$invalidate(3, installConfirmClick = $$props.installConfirmClick);
    	};

    	return [userscript, installError, installCancelClick, installConfirmClick];
    }

    class InstallView extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			userscript: 0,
    			installError: 1,
    			installCancelClick: 2,
    			installConfirmClick: 3
    		});
    	}
    }

    var iconOpen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20"><path d="M21.6 2.875H12L9.6.5H2.4A2.384 2.384 0 00.012 2.875L0 17.125C0 18.431 1.08 19.5 2.4 19.5h19.2c1.32 0 2.4-1.069 2.4-2.375V5.25c0-1.306-1.08-2.375-2.4-2.375zm0 14.25H2.4V5.25h19.2v11.875z" fill-rule="nonzero"/></svg>';

    var iconClear = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm4.9 6L12 10.9 7.1 6 6 7.1l4.9 4.9L6 16.9 7.1 18l4.9-4.9 4.9 4.9 1.1-1.1-4.9-4.9L18 7.1 16.9 6z" fill-rule="evenodd"/></svg>';

    var iconRefresh = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M24 9.333V0l-3.52 3.52A11.916 11.916 0 0 0 12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12h-2.667c0 5.147-4.186 9.333-9.333 9.333S2.667 17.147 2.667 12 6.853 2.667 12 2.667A9.357 9.357 0 0 1 18.6 5.4l-3.933 3.933H24Z" fill-rule="nonzero"/></svg>';

    /* src/popup/App.svelte generated by Svelte v3.29.0 */

    const { window: window_1 } = globals;

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[42] = list[i];
    	return child_ctx;
    }

    // (381:0) {#if !active}
    function create_if_block_9(ctx) {
    	return { c: noop, m: noop, d: noop };
    }

    // (384:0) {#if showInstallPrompt}
    function create_if_block_8(ctx) {
    	let div;
    	let t0;
    	let span;
    	let t1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Userscript Detected: ");
    			span = element("span");
    			t1 = text(/*showInstallPrompt*/ ctx[15]);
    			attr(span, "class", "svelte-1w80sz6");
    			attr(div, "class", "warn svelte-1w80sz6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, span);
    			append(span, t1);
    			/*div_binding*/ ctx[31](div);

    			if (!mounted) {
    				dispose = listen(span, "click", /*showInstallView*/ ctx[27]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*showInstallPrompt*/ 32768) set_data(t1, /*showInstallPrompt*/ ctx[15]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			/*div_binding*/ ctx[31](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (389:0) {#if error}
    function create_if_block_7(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let iconbutton;
    	let current;

    	iconbutton = new IconButton({
    			props: { icon: iconClear, title: "Clear error" }
    		});

    	iconbutton.$on("click", /*click_handler_1*/ ctx[32]);

    	return {
    		c() {
    			div = element("div");
    			t0 = text(/*error*/ ctx[0]);
    			t1 = space();
    			create_component(iconbutton.$$.fragment);
    			attr(div, "class", "error svelte-1w80sz6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			mount_component(iconbutton, div, null);
    			/*div_binding_1*/ ctx[33](div);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*error*/ 1) set_data(t0, /*error*/ ctx[0]);
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
    			/*div_binding_1*/ ctx[33](null);
    		}
    	};
    }

    // (411:8) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*list*/ ctx[19];
    	const get_key = ctx => /*item*/ ctx[42].filename;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "items svelte-1w80sz6");
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
    			if (dirty[0] & /*list, toggleItem*/ 8912896) {
    				const each_value = /*list*/ ctx[19];
    				group_outros();
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				check_outros();
    			}

    			if (dirty[0] & /*disabled*/ 8) {
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

    // (409:35) 
    function create_if_block_6(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "No matched userscripts";
    			attr(div, "class", "none svelte-1w80sz6");
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

    // (405:28) 
    function create_if_block_5(ctx) {
    	let div;
    	let t0;
    	let span;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Something went wrong: ");
    			span = element("span");
    			span.textContent = "click to retry";
    			attr(span, "class", "link svelte-1w80sz6");
    			attr(div, "class", "none svelte-1w80sz6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, span);

    			if (!mounted) {
    				dispose = listen(span, "click", /*click_handler_2*/ ctx[34]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (403:8) {#if inactive}
    function create_if_block_4$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Popup inactive on extension page";
    			attr(div, "class", "none svelte-1w80sz6");
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

    // (400:4) {#if loading}
    function create_if_block_3$1(ctx) {
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

    // (413:16) {#each list as item (item.filename)}
    function create_each_block$2(key_1, ctx) {
    	let first;
    	let popupitem;
    	let current;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[35](/*item*/ ctx[42], ...args);
    	}

    	popupitem = new PopupItem({
    			props: {
    				enabled: !/*item*/ ctx[42].disabled,
    				name: /*item*/ ctx[42].name,
    				subframe: /*item*/ ctx[42].subframe,
    				type: /*item*/ ctx[42].type
    			}
    		});

    	popupitem.$on("click", click_handler_3);

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
    			if (dirty[0] & /*list*/ 524288) popupitem_changes.enabled = !/*item*/ ctx[42].disabled;
    			if (dirty[0] & /*list*/ 524288) popupitem_changes.name = /*item*/ ctx[42].name;
    			if (dirty[0] & /*list*/ 524288) popupitem_changes.subframe = /*item*/ ctx[42].subframe;
    			if (dirty[0] & /*list*/ 524288) popupitem_changes.type = /*item*/ ctx[42].type;
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

    // (426:0) {#if !inactive && platform === "macos"}
    function create_if_block_2$1(ctx) {
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
    			attr(div1, "class", "footer svelte-1w80sz6");
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

    // (444:22) 
    function create_if_block_1$1(ctx) {
    	let view;
    	let current;

    	view = new View({
    			props: {
    				headerTitle: "Install Userscript",
    				loading: /*disabled*/ ctx[3],
    				closeClick: /*func_2*/ ctx[39],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const view_changes = {};
    			if (dirty[0] & /*disabled*/ 8) view_changes.loading = /*disabled*/ ctx[3];
    			if (dirty[0] & /*showInstall*/ 65536) view_changes.closeClick = /*func_2*/ ctx[39];

    			if (dirty[0] & /*installViewUserscript, installViewUserscriptError, showInstall*/ 458752 | dirty[1] & /*$$scope*/ 16384) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    // (431:0) {#if showUpdates}
    function create_if_block$5(ctx) {
    	let view;
    	let current;

    	view = new View({
    			props: {
    				headerTitle: "Updates",
    				loading: /*disabled*/ ctx[3],
    				closeClick: /*func*/ ctx[37],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const view_changes = {};
    			if (dirty[0] & /*disabled*/ 8) view_changes.loading = /*disabled*/ ctx[3];
    			if (dirty[0] & /*showUpdates*/ 32) view_changes.closeClick = /*func*/ ctx[37];

    			if (dirty[0] & /*updates*/ 64 | dirty[1] & /*$$scope*/ 16384) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    // (445:4) <View         headerTitle={"Install Userscript"}         loading={disabled}         closeClick={() => showInstall = false}     >
    function create_default_slot_1(ctx) {
    	let installview;
    	let current;

    	installview = new InstallView({
    			props: {
    				userscript: /*installViewUserscript*/ ctx[17],
    				installError: /*installViewUserscriptError*/ ctx[18],
    				installCancelClick: /*func_1*/ ctx[38],
    				installConfirmClick: /*installConfirm*/ ctx[28]
    			}
    		});

    	return {
    		c() {
    			create_component(installview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(installview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const installview_changes = {};
    			if (dirty[0] & /*installViewUserscript*/ 131072) installview_changes.userscript = /*installViewUserscript*/ ctx[17];
    			if (dirty[0] & /*installViewUserscriptError*/ 262144) installview_changes.installError = /*installViewUserscriptError*/ ctx[18];
    			if (dirty[0] & /*showInstall*/ 65536) installview_changes.installCancelClick = /*func_1*/ ctx[38];
    			installview.$set(installview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(installview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(installview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(installview, detaching);
    		}
    	};
    }

    // (432:4) <View         headerTitle={"Updates"}         loading={disabled}         closeClick={() => showUpdates = false}     >
    function create_default_slot(ctx) {
    	let updateview;
    	let current;

    	updateview = new UpdateView({
    			props: {
    				checkClick: /*checkForUpdates*/ ctx[24],
    				updateClick: /*updateAll*/ ctx[21],
    				updateSingleClick: /*updateItem*/ ctx[22],
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
    			if (dirty[0] & /*updates*/ 64) updateview_changes.updates = /*updates*/ ctx[6];
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

    function create_fragment$8(ctx) {
    	let div0;
    	let iconbutton0;
    	let t0;
    	let iconbutton1;
    	let t1;
    	let iconbutton2;
    	let t2;
    	let toggle;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let div1;
    	let current_block_type_index;
    	let if_block3;
    	let div1_class_value;
    	let t7;
    	let t8;
    	let current_block_type_index_1;
    	let if_block5;
    	let if_block5_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	iconbutton0 = new IconButton({
    			props: {
    				icon: iconOpen,
    				title: "Open save location",
    				disabled: /*disabled*/ ctx[3] || /*platform*/ ctx[10] !== "macos"
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

    	iconbutton1.$on("click", /*click_handler*/ ctx[29]);

    	iconbutton2 = new IconButton({
    			props: {
    				icon: iconRefresh,
    				title: "Refresh view",
    				disabled: /*disabled*/ ctx[3]
    			}
    		});

    	iconbutton2.$on("click", /*refreshView*/ ctx[25]);

    	toggle = new Toggle({
    			props: {
    				checked: /*active*/ ctx[1],
    				title: "Toggle injection",
    				disabled: /*disabled*/ ctx[3]
    			}
    		});

    	toggle.$on("click", /*toggleExtension*/ ctx[20]);
    	let if_block0 = !/*active*/ ctx[1] && create_if_block_9();
    	let if_block1 = /*showInstallPrompt*/ ctx[15] && create_if_block_8(ctx);
    	let if_block2 = /*error*/ ctx[0] && create_if_block_7(ctx);

    	const if_block_creators = [
    		create_if_block_3$1,
    		create_if_block_4$1,
    		create_if_block_5,
    		create_if_block_6,
    		create_else_block$2
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[2]) return 0;
    		if (/*inactive*/ ctx[9]) return 1;
    		if (/*initError*/ ctx[11]) return 2;
    		if (/*items*/ ctx[4].length < 1) return 3;
    		return 4;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block3 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block4 = !/*inactive*/ ctx[9] && /*platform*/ ctx[10] === "macos" && create_if_block_2$1();
    	const if_block_creators_1 = [create_if_block$5, create_if_block_1$1];
    	const if_blocks_1 = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*showUpdates*/ ctx[5]) return 0;
    		if (/*showInstall*/ ctx[16]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index_1 = select_block_type_1(ctx))) {
    		if_block5 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    	}

    	return {
    		c() {
    			div0 = element("div");
    			create_component(iconbutton0.$$.fragment);
    			t0 = space();
    			create_component(iconbutton1.$$.fragment);
    			t1 = space();
    			create_component(iconbutton2.$$.fragment);
    			t2 = space();
    			create_component(toggle.$$.fragment);
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			div1 = element("div");
    			if_block3.c();
    			t7 = space();
    			if (if_block4) if_block4.c();
    			t8 = space();
    			if (if_block5) if_block5.c();
    			if_block5_anchor = empty();
    			attr(div0, "class", "header svelte-1w80sz6");
    			attr(div1, "class", div1_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-1w80sz6");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			mount_component(iconbutton0, div0, null);
    			append(div0, t0);
    			mount_component(iconbutton1, div0, null);
    			append(div0, t1);
    			mount_component(iconbutton2, div0, null);
    			append(div0, t2);
    			mount_component(toggle, div0, null);
    			/*div0_binding*/ ctx[30](div0);
    			insert(target, t3, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t4, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t5, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, t6, anchor);
    			insert(target, div1, anchor);
    			if_blocks[current_block_type_index].m(div1, null);
    			/*div1_binding*/ ctx[36](div1);
    			insert(target, t7, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert(target, t8, anchor);

    			if (~current_block_type_index_1) {
    				if_blocks_1[current_block_type_index_1].m(target, anchor);
    			}

    			insert(target, if_block5_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(window_1, "resize", /*resize*/ ctx[26]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const iconbutton0_changes = {};
    			if (dirty[0] & /*disabled, platform*/ 1032) iconbutton0_changes.disabled = /*disabled*/ ctx[3] || /*platform*/ ctx[10] !== "macos";
    			iconbutton0.$set(iconbutton0_changes);
    			const iconbutton1_changes = {};
    			if (dirty[0] & /*updates*/ 64) iconbutton1_changes.notification = /*updates*/ ctx[6].length;
    			if (dirty[0] & /*disabled*/ 8) iconbutton1_changes.disabled = /*disabled*/ ctx[3];
    			iconbutton1.$set(iconbutton1_changes);
    			const iconbutton2_changes = {};
    			if (dirty[0] & /*disabled*/ 8) iconbutton2_changes.disabled = /*disabled*/ ctx[3];
    			iconbutton2.$set(iconbutton2_changes);
    			const toggle_changes = {};
    			if (dirty[0] & /*active*/ 2) toggle_changes.checked = /*active*/ ctx[1];
    			if (dirty[0] & /*disabled*/ 8) toggle_changes.disabled = /*disabled*/ ctx[3];
    			toggle.$set(toggle_changes);

    			if (!/*active*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_9();
    					if_block0.c();
    					if_block0.m(t4.parentNode, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showInstallPrompt*/ ctx[15]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_8(ctx);
    					if_block1.c();
    					if_block1.m(t5.parentNode, t5);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*error*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*error*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_7(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(t6.parentNode, t6);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
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
    				if_block3 = if_blocks[current_block_type_index];

    				if (!if_block3) {
    					if_block3 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block3.c();
    				}

    				transition_in(if_block3, 1);
    				if_block3.m(div1, null);
    			}

    			if (!current || dirty[0] & /*rowColors*/ 256 && div1_class_value !== (div1_class_value = "main " + (/*rowColors*/ ctx[8] || "") + " svelte-1w80sz6")) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (!/*inactive*/ ctx[9] && /*platform*/ ctx[10] === "macos") {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2$1();
    					if_block4.c();
    					if_block4.m(t8.parentNode, t8);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			let previous_block_index_1 = current_block_type_index_1;
    			current_block_type_index_1 = select_block_type_1(ctx);

    			if (current_block_type_index_1 === previous_block_index_1) {
    				if (~current_block_type_index_1) {
    					if_blocks_1[current_block_type_index_1].p(ctx, dirty);
    				}
    			} else {
    				if (if_block5) {
    					group_outros();

    					transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
    						if_blocks_1[previous_block_index_1] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index_1) {
    					if_block5 = if_blocks_1[current_block_type_index_1];

    					if (!if_block5) {
    						if_block5 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
    						if_block5.c();
    					}

    					transition_in(if_block5, 1);
    					if_block5.m(if_block5_anchor.parentNode, if_block5_anchor);
    				} else {
    					if_block5 = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(iconbutton0.$$.fragment, local);
    			transition_in(iconbutton1.$$.fragment, local);
    			transition_in(iconbutton2.$$.fragment, local);
    			transition_in(toggle.$$.fragment, local);
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block5);
    			current = true;
    		},
    		o(local) {
    			transition_out(iconbutton0.$$.fragment, local);
    			transition_out(iconbutton1.$$.fragment, local);
    			transition_out(iconbutton2.$$.fragment, local);
    			transition_out(toggle.$$.fragment, local);
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block5);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			destroy_component(iconbutton0);
    			destroy_component(iconbutton1);
    			destroy_component(iconbutton2);
    			destroy_component(toggle);
    			/*div0_binding*/ ctx[30](null);
    			if (detaching) detach(t3);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach(t4);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t5);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(t6);
    			if (detaching) detach(div1);
    			if_blocks[current_block_type_index].d();
    			/*div1_binding*/ ctx[36](null);
    			if (detaching) detach(t7);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach(t8);

    			if (~current_block_type_index_1) {
    				if_blocks_1[current_block_type_index_1].d(detaching);
    			}

    			if (detaching) detach(if_block5_anchor);
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

    	await browser.tabs.create({ url });
    }

    async function openSaveLocation() {
    	await browser.runtime.sendNativeMessage({ name: "OPEN_SAVE_LOCATION" });
    	window.close();
    }

    function instance$8($$self, $$props, $$invalidate) {
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
    	let initError;
    	let windowHeight = 0;
    	let header;
    	let warn;
    	let err;
    	let showInstallPrompt;
    	let showInstall;
    	let installViewUserscript;
    	let installViewUserscriptError;

    	function toggleExtension(e) {
    		e.preventDefault(); // prevent check state from changing on click
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
    		$$invalidate(11, initError = false);

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

    	function refreshView() {
    		$$invalidate(0, error = undefined);
    		$$invalidate(2, loading = true);
    		$$invalidate(3, disabled = true);
    		$$invalidate(4, items = []);
    		$$invalidate(5, showUpdates = false);
    		$$invalidate(6, updates = []);
    		$$invalidate(9, inactive = false);
    		initialize();
    	}

    	async function initialize() {
    		// get platform first since it applies important styling
    		let pltfm;

    		try {
    			pltfm = await browser.runtime.sendNativeMessage({ name: "REQ_PLATFORM" });
    		} catch(error) {
    			console.log("Error for pltfm promise: " + error);
    			$$invalidate(11, initError = true);
    			$$invalidate(2, loading = false);
    			return;
    		}

    		if (pltfm.error) {
    			$$invalidate(0, error = pltfm.error);
    			$$invalidate(2, loading = false);
    			$$invalidate(3, disabled = false);
    			return;
    		} else {
    			$$invalidate(10, platform = pltfm.platform);
    		}

    		// run init checks
    		// const init = await browser.runtime.sendNativeMessage({name: "POPUP_INIT"}).catch(error => {});
    		let init;

    		try {
    			init = await browser.runtime.sendNativeMessage({ name: "POPUP_INIT" });
    		} catch(error) {
    			console.log("Error for init promise: " + error);
    			$$invalidate(11, initError = true);
    			$$invalidate(2, loading = false);
    			return;
    		}

    		if (init.error) {
    			$$invalidate(0, error = init.error);
    			$$invalidate(2, loading = false);
    			$$invalidate(3, disabled = false);
    			return;
    		} else {
    			$$invalidate(1, active = init.initData.active === "true" ? true : false);
    		}

    		// set popup height
    		resize();

    		// get matches
    		const extensionPageUrl = browser.runtime.getURL("page.html");

    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    		const url = tabs[0].url;
    		const frameUrls = [];

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
    		let matches;

    		try {
    			matches = await browser.runtime.sendNativeMessage(message);
    		} catch(error) {
    			console.log("Error for matches promise: " + error); // response = await browser.runtime.sendMessage(message);
    			$$invalidate(11, initError = true);
    			$$invalidate(2, loading = false);
    			return;
    		}

    		if (matches.error) {
    			$$invalidate(0, error = matches.error);
    			$$invalidate(2, loading = false);
    			$$invalidate(3, disabled = false);
    			return;
    		} else {
    			$$invalidate(4, items = matches.matches);
    		}

    		// get updates
    		let updatesResponse;

    		try {
    			updatesResponse = await browser.runtime.sendNativeMessage({ name: "POPUP_UPDATES" });
    		} catch(error) {
    			console.log("Error for updates promise: " + error);
    			$$invalidate(11, initError = true);
    			$$invalidate(2, loading = false);
    			return;
    		}

    		if (updatesResponse.error) {
    			$$invalidate(0, error = updatesResponse.error);
    			$$invalidate(2, loading = false);
    			$$invalidate(3, disabled = false);
    			return;
    		} else {
    			$$invalidate(6, updates = updatesResponse.updates);
    		}

    		// check if current page url is a userscript
    		if (url.endsWith(".user.js")) {
    			// if it does, send message to content script
    			// content script will get dom content, and send it to the bg page
    			// the bg page will send the content to the swift side for parsing
    			// when swift side parses and returns, the bg page will send a response to the content script
    			// then the content script will send response to the popup
    			// Content scripts that are injected into web content cannot send messages to the native app
    			// https://developer.apple.com/documentation/safariservices/safari_web_extensions/messaging_between_the_app_and_javascript_in_a_safari_web_extension
    			const response = await browser.tabs.sendMessage(tabs[0].id, { name: "USERSCRIPT_INSTALL_00" });

    			if (response.error) {
    				console.log("Error checking .user.js url: " + response.error);
    			} else {
    				// the response will contain the string to display
    				// ex: {success: "Click to install"}
    				console.log(response);

    				let prompt = response.success;
    				$$invalidate(15, showInstallPrompt = prompt);
    			}
    		}

    		$$invalidate(2, loading = false);
    		$$invalidate(3, disabled = false);
    	}

    	function resize() {
    		if (platform != "ios") return;

    		// on ios programmatically set the height of the scrollable container
    		// first get the header height
    		const headerHeight = header.offsetHeight;

    		// then check if a warning or error is visible (ie. taking up height)
    		let addHeight = 0;

    		// if warn or error elements visible, also subtract that from applied height
    		if (warn) addHeight += warn.offsetHeight;

    		if (err) addHeight += err.offsetHeight;
    		windowHeight = window.outerHeight - (headerHeight + addHeight);
    		$$invalidate(7, main.style.height = windowHeight + "px", main);
    		$$invalidate(7, main.style.paddingBottom = headerHeight + "px", main);
    	}

    	async function showInstallView() {
    		// disable all buttons
    		$$invalidate(3, disabled = true);

    		// show the install view
    		$$invalidate(16, showInstall = true);

    		// get the active tab
    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });

    		// send content script a message on the active tab
    		const response = await browser.tabs.sendMessage(tabs[0].id, { name: "USERSCRIPT_INSTALL_01" });

    		// when above message is sent, content script will get active tab's stringified dom content
    		// and then send that content and a message to the bg page
    		// the bg page will send a message and the content to the swift side for parsing
    		// swift side will parse then send a response to the bg page
    		// the bg page will then send the response to the content script
    		// the content script will then send a response here
    		// if the response includes an error, display it in the view
    		if (response.error) {
    			console.log("Can not install userscript: " + response.error);
    			$$invalidate(18, installViewUserscriptError = response.error);
    		} else {
    			console.log(response);
    			$$invalidate(17, installViewUserscript = response);
    		}

    		$$invalidate(3, disabled = false);
    	}

    	async function installConfirm() {
    		// disabled all buttons
    		$$invalidate(3, disabled = true);

    		// show loading element
    		$$invalidate(2, loading = true);

    		// go back to main view
    		$$invalidate(16, showInstall = false);

    		// get the active tab
    		const tabs = await browser.tabs.query({ currentWindow: true, active: true });

    		// send content script a message on the active tab, which will start the install process
    		const response = await browser.tabs.sendMessage(tabs[0].id, { name: "USERSCRIPT_INSTALL_02" });

    		if (response.error) {
    			$$invalidate(0, error = response.error);
    			$$invalidate(3, disabled = false);
    			$$invalidate(2, loading = false);
    			return;
    		} else {
    			// if response did not have an error, userscript installed successfully
    			// refresh popup
    			refreshView();
    		}
    	}

    	onMount(async () => {
    		await initialize();

    		// run resize again for good measure
    		resize();
    	});

    	const click_handler = () => $$invalidate(5, showUpdates = true);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			header = $$value;
    			$$invalidate(12, header);
    		});
    	}

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			warn = $$value;
    			$$invalidate(13, warn);
    		});
    	}

    	const click_handler_1 = () => $$invalidate(0, error = undefined);

    	function div_binding_1($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			err = $$value;
    			$$invalidate(14, err);
    		});
    	}

    	const click_handler_2 = () => window.location.reload();
    	const click_handler_3 = item => toggleItem(item);

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			main = $$value;
    			$$invalidate(7, main);
    		});
    	}

    	const func = () => $$invalidate(5, showUpdates = false);
    	const func_1 = () => $$invalidate(16, showInstall = false);
    	const func_2 = () => $$invalidate(16, showInstall = false);
    	let list;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*items*/ 16) {
    			 $$invalidate(19, list = items.sort((a, b) => a.name.localeCompare(b.name)));
    		}

    		if ($$self.$$.dirty[0] & /*list*/ 524288) {
    			 if (list.length > 1 && list.length % 2 === 0) {
    				$$invalidate(8, rowColors = "even");
    			} else if (list.length > 1 && list.length % 2 != 0) {
    				$$invalidate(8, rowColors = "odd");
    			} else {
    				$$invalidate(8, rowColors = undefined);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*platform*/ 1024) {
    			 if (platform) document.body.classList.add(platform);
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
    		initError,
    		header,
    		warn,
    		err,
    		showInstallPrompt,
    		showInstall,
    		installViewUserscript,
    		installViewUserscriptError,
    		list,
    		toggleExtension,
    		updateAll,
    		updateItem,
    		toggleItem,
    		checkForUpdates,
    		refreshView,
    		resize,
    		showInstallView,
    		installConfirm,
    		click_handler,
    		div0_binding,
    		div_binding,
    		click_handler_1,
    		div_binding_1,
    		click_handler_2,
    		click_handler_3,
    		div1_binding,
    		func,
    		func_1,
    		func_2
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {}, [-1, -1]);
    	}
    }

    const app = new App({
        target: document.getElementById("app"),
        props: {}
    });

}());