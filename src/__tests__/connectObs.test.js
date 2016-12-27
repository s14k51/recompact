import React from 'react'
import Rx from 'rxjs'
import { mount, shallow } from 'enzyme'
import { Dummy } from './utils'
import { connectObs, compose, mapProps, setObservableConfig, withObs } from '../'
import rxjsObservableConfig from '../rxjsObservableConfig'

describe('connectObs', () => {
  beforeEach(() => {
    setObservableConfig(rxjsObservableConfig)
  })

  afterEach(() => {
    setObservableConfig({
      toESObservable: undefined,
      fromESObservable: undefined,
    })
  })

  it('should connect observables to props', () => {
    const baseClassName$ = new Rx.BehaviorSubject('foo')
    const Component = compose(
      withObs({ className$: baseClassName$ }),
      connectObs(({ className$ }) => ({ className: className$ })),
    )('div')

    const wrapper = mount(<Component />)
    expect(wrapper.find('div').prop('className')).toBe('foo')

    baseClassName$.next('bar')

    expect(wrapper.find('div').prop('className')).toBe('bar')
  })

  it('should connect observer to props', () => {
    const baseChange$ = new Rx.Subject()
    const changeSpy = jest.fn()
    baseChange$.subscribe(changeSpy)

    const Component = compose(
      withObs({ change$: baseChange$ }),
      connectObs(({ change$ }) => ({ onChange: change$ })),
    )('input')

    const wrapper = mount(<Component />)
    expect(changeSpy).not.toHaveBeenCalled()

    wrapper.find('input').prop('onChange')('foo')
    expect(changeSpy).toHaveBeenCalledTimes(1)
    expect(changeSpy).toHaveBeenLastCalledWith('foo')
  })

  it('should receive props$', () => {
    const Component = compose(
      connectObs(({ props$ }) => ({ className: props$.pluck('foo') })),
    )(Dummy)

    const wrapper = mount(<Component foo="bar" />)
    expect(wrapper.find(Dummy).prop('className')).toBe('bar')

    wrapper.setProps({ foo: 'foo' })

    expect(wrapper.find(Dummy).prop('className')).toBe('foo')
  })

  it('should not start by undefined if there is a value', () => {
    const spy = jest.fn()
    const Component = compose(
      withObs({
        foo$: Rx.Observable.of('foo'),
        bar$: Rx.Observable.never(),
        dar$: Rx.Observable.of('dar'),
      }),
      connectObs(({ foo$, bar$, dar$ }) => ({
        foo: foo$,
        bar: bar$,
        dar: dar$,
      })),
      mapProps((props) => {
        spy(props)
        return props
      }),
    )(Dummy)

    mount(<Component />)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].foo).toBe('foo')
    expect(spy.mock.calls[0][0].dar).toBe('dar')
    expect(spy.mock.calls[0][0].bar).toBe(undefined)
  })

  it('should be merged with other hoc', () => {
    const Component = compose(
      withObs({ className$: Rx.Observable.of('foo') }),
      connectObs(({ className$ }) => ({ className: className$ })),
    )('div')

    const wrapper = shallow(<Component />)
    expect(wrapper.instance().constructor.displayName).toBe('withObs(connectObs(div))')
    expect(wrapper.equals(<div className="foo" />)).toBeTruthy()
  })
})
