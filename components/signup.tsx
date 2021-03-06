import {Component} from 'react'
import {Box, Button, Heading, Input, Lead, Text} from 'rebass'

import updateStateKeys from '../functions/update-state-keys'
import {SignupModalContext, SocketContext, UserContext, UserAuthContext} from '../pages/_app'

enum Step {EnterEmail, ConfirmCode, Conclusion}

interface PropsWithContext {
  closeSignupModal: () => any,
  signInUser: (object) => any,
  socket: SocketIOClient.Socket,
  user: User,
}

interface State {
  didVerificationFail: boolean,
  inputCode: string,
  inputEmail: string,
  isEmailInvalid: boolean,
  isSubmitting: boolean,
  step: Step,
}

class Signup extends Component<PropsWithContext, State> {
  state: State = {
    didVerificationFail: false,
    inputCode: '',
    inputEmail: '',
    isEmailInvalid: false,
    isSubmitting: false,
    step: Step.EnterEmail,
  }

  componentDidMount () {
    this.listenForMessages()
  }

  componentWillUnmount () {
    this.stopListeningForMessages()
  }

  render () {
    switch (this.state.step) {
      case Step.EnterEmail:
        return <Box>
          <Heading fontSize={3}>First, we need to verify an email address of yours.</Heading>
          <Lead>We think it'll make people less likely to say crazy things.</Lead>
          <form onSubmit={this.handleEmailFormSubmit}>
            <Input type='email' placeholder='Your email' name='email' onChange={this.handleEmailInputChange} value={this.state.inputEmail} />
            {this.state.isEmailInvalid && <Text color='red'>That email address isn't valid. Try again.</Text>}
            <Button disabled={this.state.isSubmitting} type='submit'>Submit</Button>
          </form>
        </Box>

      case Step.ConfirmCode:
        return <Box>
          <Heading fontSize={3}>Check your inbox for a verification code!</Heading>
          <Lead>Enter it below:</Lead>
          <form onSubmit={this.handleCodeFormSubmit}>
            <Input type='number' placeholder='Your code' onChange={this.handleCodeInputChange} value={this.state.inputCode} />
            {this.state.didVerificationFail && <Text color='red'>We couldn't verify that code.</Text>}
            <Button disabled={this.state.isSubmitting} type='submit'>Submit</Button>
          </form>
        </Box>

      case Step.Conclusion:
        return <Box>
          <Heading fontSize={3}>Thanks for verifying your email!</Heading>
          <Lead>You are now signed in as <strong>{this.props.user.handle}</strong>. No, you can't change it, so just enjoy it.</Lead>
          <Button onClick={this.props.closeSignupModal} type='submit'>Close</Button>
        </Box>
    }
  }

  handleCodeInputChange = e => this.setState(updateStateKeys({inputCode: e.target.value}))
  handleEmailInputChange = e => this.setState(updateStateKeys({inputEmail: e.target.value}))

  handleEmailFormSubmit = e => {
    e.preventDefault()
    this.setState(updateStateKeys({isEmailInvalid: false, isSubmitting: true}))
    this.props.socket.emit('verify email', this.state.inputEmail)
  }

  handleCodeFormSubmit = e => {
    e.preventDefault()
    this.setState(updateStateKeys({didVerificationFail: false, isSubmitting: true}))
    this.props.socket.emit('verify code', [this.state.inputCode, this.state.inputEmail])
  }

  handleInvalidEmail = () => this.setState(updateStateKeys({isEmailInvalid: true, isSubmitting: false}))
  handleEmailSent = () => this.setState(updateStateKeys({step: Step.ConfirmCode, isSubmitting: false}))
  handleCodeVerified = ({token, user}) => {
    this.props.signInUser({token, user})
    this.setState(updateStateKeys({step: Step.Conclusion, isSubmitting: false}))
  }
  handleCodeVerificationFailed = () => this.setState(updateStateKeys({didVerificationFail: true, isSubmitting: false}))

  listenForMessages = () => {
    this.props.socket.on('invalid signup email', this.handleInvalidEmail)
    this.props.socket.on('code email sent', this.handleEmailSent)
    this.props.socket.on('code verified', this.handleCodeVerified)
    this.props.socket.on('code verification failed', this.handleCodeVerificationFailed)
  }

  stopListeningForMessages = () => {
    this.props.socket.off('invalid signup email', this.handleInvalidEmail)
    this.props.socket.off('code email sent', this.handleEmailSent)
    this.props.socket.off('code verified', this.handleCodeVerified)
    this.props.socket.off('code verification failed', this.handleCodeVerificationFailed)
  }
}

export default props => <SocketContext.Consumer>
  {socket => <SignupModalContext.Consumer>
    {({closeSignupModal}) => <UserAuthContext.Consumer>
      {({signIn}) => <UserContext.Consumer>
        {user => <Signup {...props} closeSignupModal={closeSignupModal} socket={socket} signInUser={signIn} user={user} />}
      </UserContext.Consumer>}
    </UserAuthContext.Consumer>}
  </SignupModalContext.Consumer>}
</SocketContext.Consumer>