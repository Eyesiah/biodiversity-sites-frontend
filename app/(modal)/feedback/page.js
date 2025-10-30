import ExternalLink from '@/components/ui/ExternalLink';
import Footer from '@/components/core/Footer';

export const metadata = {
  title: 'Feedback',
};

export default function Feedback() {
  return (
    <>
      <div className="container">
        <div className="main prose">        

          <p>This website is still in beta, so we&apos;re interested to receive any feedback from users in the BNG/BGS community about what works for you.</p>
          <p>Please send your feedback to: BGS_Suggestions@bristoltreeforum.org.</p>
          <p>If you have a bug to report or new feature suggestion, please email us or create a new issue on our <ExternalLink href="https://github.com/Eyesiah/biodiversity-sites-frontend/issues">GitHub page</ExternalLink>.</p>
              
        </div>
      </div>
   </>
  );
}