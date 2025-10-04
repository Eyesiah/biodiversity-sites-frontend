import ExternalLink from '@/components/ExternalLink';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Feedback',
};

export default function Feedback() {
  return (
    <>
      <div className="container">
        <div className="main prose">        

          <p>This website is still in beta, so we're interested to receive any feedback from users in the BNG/BGS industry about what works.</p>
          <p>Please send feedback to <a href="mailto:BGS_Suggestions@bristoltreeforum.org">Send email</a></p>
          <p>If you have a bug report or new feature suggestion, please make a new issue on our <ExternalLink href="https://github.com/Eyesiah/biodiversity-sites-frontend/issues">GitHub page</ExternalLink>.</p>
              
        </div>
      </div>
    <Footer />
   </>
  );
}