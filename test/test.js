/* global Event, CustomEvent */

import test from 'tape'
import reactPolymer from '../'
import React from 'react'
import {render} from 'react-dom'
import {
  PaperCheckbox,
  PaperToggleButton,
  PaperInput,
  PaperTextarea,
  IronAutogrowTextarea,
  PaperSlider,
  PaperListbox,
  PaperRadioGroup,
  PaperTabs,
  IronSelector
} from '../input'

reactPolymer.registerEvent('iron-change', 'onIronChange')
reactPolymer.registerEvent('change', 'onChange')
reactPolymer.registerAttribute('drawer')

function expectedClass (className, xScope) {
  if (window.ShadyCSS.nativeCss) return className
  return className + ' ' + xScope
}

function renderContainer (element) {
  var container = document.createElement('div')
  document.body.appendChild(container)
  render(element, container)
  return container.firstChild
}

function immediateRef (func) { // Necessary for firefox
  return ref => setTimeout(() => func(ref), 0)
}

function setImmediate (func) {
  setTimeout(func, 0)
}

test('React renders simple Polymer elements', t => {
  // This should work without react-polymer
  var checkbox = renderContainer(<paper-checkbox noink />)

  t.ok(checkbox)
  t.equal(checkbox.tagName, 'PAPER-CHECKBOX')
  setImmediate(() => {
    t.equal(checkbox.getAttribute('role'), 'checkbox')
    t.equal(checkbox.getAttribute('noink'), 'true')
    t.end()
  })
})

test('React reads & writes custom attributes on Polymer elements', t => {
  // This should work without react-polymer
  t.plan(1)
  t.timeoutAfter(2000)

  renderContainer(
    <paper-progress secondary-progress='40'
      ref={immediateRef(ref => t.equal(ref.secondaryRatio, 40))} />)
})

test('attribute=false means no attribute set', t => {
  // ...instead of the string 'false'.
  t.plan(1)
  t.timeoutAfter(2000)

  var checkbox = renderContainer(<paper-checkbox disabled={false} />)

  setImmediate(() => {
    t.equal(checkbox.disabled, false)
  })
})

test('dynamic attribute=false means no attribute set', t => {
  // ...instead of the string 'false'.
  t.plan(1)
  t.timeoutAfter(2000)

  var Wrapper = React.createClass({
    getInitialState () {
      return {disabled: true}
    },
    componentDidMount () {
      this.setState({disabled: false})
    },
    render () {
      return <paper-checkbox disabled={this.state.disabled} />
    }
  })

  var checkbox = renderContainer(<Wrapper />)

  setImmediate(() => {
    t.equal(checkbox.disabled, false)
  })
})

test('react-polymer adds custom event listeners', t => {
  t.plan(1)
  t.timeoutAfter(2000)

  var ready = false

  var checkbox = renderContainer(<paper-checkbox onIronChange={() => ready && t.pass('iron-change event received')} />)

  setImmediate(() => {
    ready = true // iron-change may be emitted while loading in firefox
    checkbox.checked = true // triggers iron-change
  })
})

test('react-polymer monkey-patches existing event listener plugins', t => {
  t.plan(1)
  t.timeoutAfter(2000)

  var checkbox = renderContainer(<paper-checkbox onChange={() => t.pass('change event received')} />)

  setImmediate(() => {
    checkbox.click() // triggers change
  })
})

test('react-polymer makes React add custom attributes to native elements', t => {
  /* This is necessary for things like:
      <paper-drawer-panel>
        <div drawer> Drawer panel... </div>
        <div main> Main panel... </div>
      </paper-drawer-panel>
  */
  t.plan(1)
  t.timeoutAfter(2000)

  renderContainer(<div drawer ref={ref => t.equal(ref.getAttribute('drawer'), 'true')} />)
})

test('react-polymer adds classes to Polymer elements', t => {
  t.plan(1)
  t.timeoutAfter(2000)

  renderContainer(<paper-checkbox className='blue' ref={immediateRef(ref => t.equal(ref.className, expectedClass('blue', 'x-scope paper-checkbox-1')))} />)
})

test('react-polymer keeps Polymer classes when React classes change', t => {
  t.plan(2)
  t.timeoutAfter(2000)

  var checkBox
  var Wrapper = React.createClass({
    getInitialState () {
      return {lamp: 'red'}
    },
    componentDidMount () {
      setImmediate(() => {
        t.equal(checkBox.className, expectedClass('red', 'x-scope paper-checkbox-1'))

        this.setState({lamp: 'green'})
        setImmediate(() => {
          t.equal(checkBox.className, expectedClass('green', ' x-scope paper-checkbox-2'))
        })
      })
    },
    render () {
      return <paper-checkbox className={this.state.lamp} ref={ref => (checkBox = ref)} />
    }
  })
  renderContainer(<Wrapper />)
})

test('react-polymer removes classes', t => {
  t.plan(1)
  t.timeoutAfter(2000)

  var checkBox
  var Wrapper = React.createClass({
    getInitialState () {
      return {hasClass: true}
    },
    componentDidMount () {
      setImmediate(() => {
        this.setState({hasClass: false})
        setImmediate(() => {
          t.equal(checkBox.className, expectedClass('', ' x-scope paper-checkbox-2'))
        })
      })
    },
    render () {
      if (this.state.hasClass) return <paper-checkbox className='red' ref={ref => (checkBox = ref)} />
      return <paper-checkbox ref={ref => (checkBox = ref)} />
    }
  })
  renderContainer(<Wrapper />)
})

// ### Polymer input wrapper ###

function generalInputTest ({name, element, valueProp, valueBefore, valueAfter, interact}) {
  test(`${name} is a controlled component`, t => {
    t.plan(1)
    t.timeoutAfter(2000)

    var input = renderContainer(React.cloneElement(element, {[valueProp]: valueBefore, onChange: () => {}}))

    setImmediate(() => {
      interact(input)
      setImmediate(() => {
        t.equal(input[valueProp], valueBefore)
      })
    })
  })

  test(`${name} updates correctly`, t => {
    t.plan(2)
    t.timeoutAfter(2000)

    var ready = false

    var Wrapper = React.createClass({
      getInitialState () {
        return {value: valueBefore}
      },
      handleChange (event) {
        if (!ready) return
        t.equal(event.target[valueProp], valueAfter, 'in event')
        this.setState({value: event.target[valueProp]})
      },
      render () {
        return React.cloneElement(element, {[valueProp]: this.state.value, onChange: this.handleChange})
      }
    })

    var input = renderContainer(<Wrapper />)

    setImmediate(() => {
      ready = true
      interact(input)
      setImmediate(() => {
        t.equal(input[valueProp], valueAfter)
      })
    })
  })

  test(`${name} is not a controlled component without ${valueProp} prop`, t => {
    t.plan(1)
    t.timeoutAfter(2000)

    var input = renderContainer(React.cloneElement(element))

    setImmediate(() => {
      interact(input)
      setImmediate(() => {
        t.equal(input[valueProp], valueAfter)
      })
    })
  })
}

// toggle

function testToggle (name, Checkbox) {
  generalInputTest({
    name,
    element: <Checkbox />,
    valueProp: 'checked',
    valueBefore: false,
    valueAfter: true,
    interact: checkbox => checkbox.click()
  })
}

testToggle('PaperCheckbox', PaperCheckbox)
testToggle('PaperToggleButton', PaperToggleButton)

// text

function testText (name, Text, nativeName) {
  function findNative (text) {
    if (name === 'PaperTextarea') text = text.shadowRoot.querySelector('iron-autogrow-textarea')
    return text.shadowRoot.querySelector(nativeName)
  }
  generalInputTest({
    name,
    element: <Text />,
    valueProp: 'value',
    valueBefore: 'Hello',
    valueAfter: 'Hello world!',
    interact: text => {
      var nativeText = findNative(text)
      nativeText.value = 'Hello world!'
      nativeText.dispatchEvent(new Event('input', {bubbles: true, composed: true}))
      // no change event, update should happen on every keystroke
    }
  })

  test(`${name} wrapper supports value`, t => {
    t.plan(2)
    t.timeoutAfter(2000)

    var text = renderContainer(<Text value='Hello world!' />)

    setImmediate(() => {
      var nativeText = findNative(text)
      t.ok(nativeText)
      t.equal(nativeText.value, 'Hello world!')
    })
  })
}

testText('PaperInput', PaperInput, 'input')
testText('PaperTextarea', PaperTextarea, 'textarea')
testText('IronAutogrowTextarea', IronAutogrowTextarea, 'textarea')

// slider

generalInputTest({
  name: 'PaperSlider',
  element: <PaperSlider />,
  valueProp: 'value',
  valueBefore: 20,
  valueAfter: 100,
  interact: slider => {
    var sliderKnob = slider.shadowRoot.querySelector('#sliderKnob')
    sliderKnob.dispatchEvent(new CustomEvent('track', {detail: {state: 'track', dx: 1000}}))
  }
})

// selector

function testSelector (name, Selector, Item) {
  generalInputTest({
    name,
    element: (
      <Selector attr-for-selected='value'>
        <Item value='small'>Small</Item>
        <Item value='medium'>Medium</Item>
      </Selector>
    ),
    valueProp: 'selected',
    valueBefore: 'medium',
    valueAfter: 'small',
    interact: selector => selector.querySelector(Item).click()
  })
}

testSelector('PaperListbox', PaperListbox, 'paper-item')
testSelector('PaperRadioGroup', PaperRadioGroup, 'paper-radio-button')
testSelector('PaperTabs', PaperTabs, 'paper-tab')
testSelector('IronSelector', IronSelector, 'div')
